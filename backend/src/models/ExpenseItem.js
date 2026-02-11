const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExpenseItem = sequelize.define('ExpenseItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    product: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tax: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    taxType: {
        type: DataTypes.ENUM('Exclusive', 'Inclusive'),
        defaultValue: 'Exclusive'
    },
    taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paid: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    due: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    ExpenseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Expenses',
            key: 'id'
        }
    }
}, { timestamps: true });

module.exports = ExpenseItem;
