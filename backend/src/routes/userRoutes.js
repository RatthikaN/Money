
const express = require('express');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, authorize('Admin', 'Manager', 'Accountant', 'Auditor'), getUsers);
router.post('/', protect, authorize('Admin', 'Manager'), createUser);
router.put('/:id', protect, authorize('Admin', 'Manager'), updateUser);
router.delete('/:id', protect, authorize('Admin'), deleteUser);

module.exports = router;
