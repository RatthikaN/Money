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
  client: {
    type: DataTypes.STRING,
    allowNull: true // Optional for general expenses, but required for client-specific ones
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
  },
  attachments: {
    type: DataTypes.TEXT('long'), // Use LONGTEXT for storing large JSON strings/Base64
    get() {
      const rawValue = this.getDataValue('attachments');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('attachments', JSON.stringify(value));
    }
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

const ExpenseItem = require('./ExpenseItem');

Expense.hasMany(ExpenseItem, { as: 'items', foreignKey: 'ExpenseId', onDelete: 'CASCADE' });
ExpenseItem.belongsTo(Expense, { foreignKey: 'ExpenseId' });

module.exports = Expense;