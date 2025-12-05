const express = require('express');
const { getExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, authorize('Admin', 'Manager', 'Accountant', 'Auditor'), getExpenses);
router.post('/', protect, authorize('Admin', 'Manager', 'Accountant'), createExpense);
router.put('/:id', protect, authorize('Admin', 'Manager', 'Accountant'), updateExpense);
router.delete('/:id', protect, authorize('Admin', 'Manager'), deleteExpense);

module.exports = router;