const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Incoming = sequelize.define('Incoming', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  client: {
    type: DataTypes.STRING,
    allowNull: false
  },
  project: {
    type: DataTypes.STRING
  },
  paymentType: {
    type: DataTypes.ENUM('One Time Payment', 'Recurring'),
    defaultValue: 'One Time Payment'
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
  mode: {
    type: DataTypes.ENUM('Cash', 'Bank', 'UPI'),
    defaultValue: 'Bank'
  },
  transactionNo: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: (incoming) => {
      incoming.dueAmount = incoming.actualAmount - incoming.paidAmount;
      if (incoming.paidAmount >= incoming.actualAmount) incoming.status = 'Paid';
      else if (incoming.paidAmount > 0) incoming.status = 'Partial';
      else incoming.status = 'Pending';
    }
  }
});

module.exports = Incoming;