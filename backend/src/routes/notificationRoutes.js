const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.put('/:id/read', protect, notificationController.markAsRead);
router.put('/read-all', protect, notificationController.markAllRead);
router.post('/subscribe', protect, notificationController.subscribe);
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router;
