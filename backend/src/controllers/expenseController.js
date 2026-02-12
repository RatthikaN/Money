const Expense = require('../models/Expense');
const ExpenseItem = require('../models/ExpenseItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const pushService = require('../services/pushService');

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      include: [{ model: ExpenseItem, as: 'items' }],
      order: [['date', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    console.error("Get Expenses Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { items, ...expenseData } = req.body;

    // Ensure attachments is passed as array/object so model setter can stringify it
    // If it's already a string (unlikely from frontend JSON), parse it first
    if (typeof expenseData.attachments === 'string') {
      try {
        expenseData.attachments = JSON.parse(expenseData.attachments);
      } catch (e) {
        expenseData.attachments = [];
      }
    }

    const expense = await Expense.create(expenseData);

    if (items && items.length > 0) {
      await Promise.all(items.map(item =>
        ExpenseItem.create({ ...item, ExpenseId: expense.id })
      ));
    }

    // Send Real-time Push Notification
    const user = await User.findByPk(req.user.id);
    if (user && user.pushSubscription) {
      await pushService.sendNotification(user.pushSubscription, {
        title: 'Expense Recorded 💸',
        body: `Recorded ${expense.name}: ${expense.actualAmount}`,
        icon: '/logo192.png'
      });
    }

    // Create internal database notification
    await Notification.create({
      title: 'Expense Recorded 💸',
      message: `Successfully recorded ${expense.name} for ${expense.actualAmount}.`,
      type: 'Success',
      userId: req.user.id
    });

    const createdExpense = await Expense.findByPk(expense.id, { include: [{ model: ExpenseItem, as: 'items' }] });
    res.status(201).json(createdExpense);
  } catch (error) {
    console.error("Create Expense Error:", error);
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { items, ...updateData } = req.body;
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (typeof updateData.attachments === 'string') {
      try {
        updateData.attachments = JSON.parse(updateData.attachments);
      } catch (e) {
        updateData.attachments = [];
      }
    }

    await expense.update(updateData);

    if (items) {
      // Replace items strategy
      await ExpenseItem.destroy({ where: { ExpenseId: expense.id } });
      if (items.length > 0) {
        await Promise.all(items.map(item =>
          ExpenseItem.create({ ...item, ExpenseId: expense.id })
        ));
      }
    }

    const updatedExpense = await Expense.findByPk(expense.id, { include: [{ model: ExpenseItem, as: 'items' }] });
    res.json(updatedExpense);
  } catch (error) {
    console.error("Update Expense Error:", error);
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await expense.destroy();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
};
