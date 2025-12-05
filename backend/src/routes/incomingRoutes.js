const express = require('express');
const { getIncoming, createIncoming, updateIncoming, deleteIncoming } = require('../controllers/incomingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, authorize('Admin', 'Manager', 'Accountant', 'Auditor', 'Client'), getIncoming);
router.post('/', protect, authorize('Admin', 'Manager', 'Accountant'), createIncoming);
router.put('/:id', protect, authorize('Admin', 'Manager', 'Accountant'), updateIncoming);
router.delete('/:id', protect, authorize('Admin', 'Manager'), deleteIncoming);

module.exports = router;