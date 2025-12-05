const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  shop: {
    type: DataTypes.STRING,
    allowNull: false
  },
  product: {
    type: DataTypes.STRING
  },
  actualAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: { min: 0 }
  },
  dueAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Paid', 'Partial', 'Pending', 'Overdue'),
    defaultValue: 'Pending'
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: (expense) => {
      expense.dueAmount = expense.actualAmount - expense.paidAmount;
      if (expense.paidAmount >= expense.actualAmount) expense.status = 'Paid';
      else if (expense.paidAmount > 0) expense.status = 'Partial';
      else expense.status = 'Pending';
    }
  }
});

module.exports = Expense;