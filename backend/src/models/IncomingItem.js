const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const IncomingItem = sequelize.define('IncomingItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    product: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hsnSac: {
        type: DataTypes.STRING
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 1
    },
    rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    taxRate: {
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
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    IncomingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Incomings',
            key: 'id'
        }
    }
}, { timestamps: true });

module.exports = IncomingItem;
