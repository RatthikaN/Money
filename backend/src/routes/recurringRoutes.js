const express = require('express');
const { getRecurring, createRecurring, updateRecurring, deleteRecurring } = require('../controllers/recurringController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Update: Allow Accountant and Auditor to fetch recurring rules (needed for Incoming Dropdown)
router.get('/', protect, authorize('Admin', 'Manager', 'Accountant', 'Auditor'), getRecurring);

router.post('/', protect, authorize('Admin', 'Manager'), createRecurring);
router.put('/:id', protect, authorize('Admin', 'Manager'), updateRecurring);
router.delete('/:id', protect, authorize('Admin', 'Manager'), deleteRecurring);

module.exports = router;