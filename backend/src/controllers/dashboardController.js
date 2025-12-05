const Expense = require('../models/Expense');
const Incoming = require('../models/Incoming');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
  try {
    const expenses = await Expense.findAll();
    const incoming = await Incoming.findAll();

    const totalIncoming = incoming.reduce((acc, i) => acc + parseFloat(i.actualAmount), 0);
    const totalReceived = incoming.reduce((acc, i) => acc + parseFloat(i.paidAmount), 0);
    const totalIncomingDue = incoming.reduce((acc, i) => acc + parseFloat(i.dueAmount), 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.actualAmount), 0);
    const totalExpensesPaid = expenses.reduce((acc, e) => acc + parseFloat(e.paidAmount), 0);
    const totalExpensesDue = expenses.reduce((acc, e) => acc + parseFloat(e.dueAmount), 0);

    const netCashFlow = totalReceived - totalExpensesPaid;

    res.json({
      totalIncoming,
      totalReceived,
      totalIncomingDue,
      totalExpenses,
      totalExpensesPaid,
      totalExpensesDue,
      netCashFlow
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};