const Expense = require('../models/Expense');
const Incoming = require('../models/Incoming');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
  try {
    const { month, year } = req.query;

    // Default to current date if not provided
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1; // 1-12

    // Calculate Start and End Date for the specific month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

    // Date Filter
    const dateFilter = {
      date: {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      }
    };

    // Fetch Data with Filters
    const expenses = await Expense.findAll({ where: dateFilter });
    const incoming = await Incoming.findAll({ where: dateFilter });

    // 1. Basic Totals
    const totalIncoming = incoming.reduce((acc, i) => acc + parseFloat(i.actualAmount), 0);
    const totalReceived = incoming.reduce((acc, i) => acc + parseFloat(i.paidAmount), 0);
    const totalIncomingDue = incoming.reduce((acc, i) => acc + parseFloat(i.dueAmount), 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.actualAmount), 0);
    const totalExpensesPaid = expenses.reduce((acc, e) => acc + parseFloat(e.paidAmount), 0);
    const totalExpensesDue = expenses.reduce((acc, e) => acc + parseFloat(e.dueAmount), 0);

    const netCashFlow = totalReceived - totalExpensesPaid;

    // 2. Online Transactions (Bank or UPI) - Based on Received Amount
    const onlineIncoming = incoming
      .filter(i => ['Bank', 'UPI'].includes(i.mode))
      .reduce((acc, i) => acc + parseFloat(i.paidAmount), 0);

    // 3. Prepare Chart Data (Daily breakdown for the month)
    const daysInMonth = endDate.getDate();
    const chartData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      const dayIncome = incoming
        .filter(inc => inc.date === dayStr)
        .reduce((sum, inc) => sum + parseFloat(inc.actualAmount), 0);

      const dayExpense = expenses
        .filter(exp => exp.date === dayStr)
        .reduce((sum, exp) => sum + parseFloat(exp.actualAmount), 0);

      chartData.push({
        name: String(i), // Day of month
        income: dayIncome,
        expense: dayExpense
      });
    }

    // 4. Client Profitability Report (aggregated from the filtered data)
    const clientDataMap = new Map();

    // Process Incoming
    incoming.forEach(i => {
      const clientName = (i.client || 'Unknown').trim();
      if (!clientDataMap.has(clientName)) {
        clientDataMap.set(clientName, { client: clientName, income: 0, expense: 0, profit: 0 });
      }
      const current = clientDataMap.get(clientName);
      current.income += parseFloat(i.actualAmount || 0);
    });

    // Process Expenses
    expenses.forEach(e => {
      const clientName = (e.client || 'General').trim();
      if (!clientDataMap.has(clientName)) {
        clientDataMap.set(clientName, { client: clientName, income: 0, expense: 0, profit: 0 });
      }
      const current = clientDataMap.get(clientName);
      current.expense += parseFloat(e.actualAmount || 0);
    });

    const clientReport = Array.from(clientDataMap.values())
      .map(c => {
        const profit = c.income - c.expense;
        let status = 'Break Even';
        if (profit > 0) status = 'Profit';
        else if (profit < 0) status = 'Loss';

        return {
          ...c,
          profit,
          status
        };
      })
      .filter(c => c.client !== 'General' || c.income > 0 || c.expense > 0) // Keep general only if it has data
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit)); // Sort by most significant impact

    res.json({
      totalIncoming,
      totalReceived,
      totalIncomingDue,
      totalExpenses,
      totalExpensesPaid,
      totalExpensesDue,
      netCashFlow,
      totalOnline: onlineIncoming,
      chartData,
      clientReport
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};