
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Manager', 'Accountant', 'Auditor', 'Client'),
    defaultValue: 'Manager'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // New Client Fields
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Security Fields
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Push Notification Subscription (Store as JSON string)
  pushSubscription: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const val = this.getDataValue('pushSubscription');
      return val ? JSON.parse(val) : null;
    },
    set(val) {
      this.setDataValue('pushSubscription', val ? JSON.stringify(val) : null);
    }
  },
  // OTP Fields for Real-Time Email 2FA
  otpCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, { timestamps: true });

module.exports = User;
