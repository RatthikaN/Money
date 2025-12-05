const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true // Use the setting name (e.g. 'general') as the ID
  },
  value: {
    type: DataTypes.JSON, // Stores the whole object (e.g. { currency: 'USD', ... })
    allowNull: false
  }
}, { timestamps: true });

module.exports = Setting;