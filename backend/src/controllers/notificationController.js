const Notification = require('../models/Notification');
const User = require('../models/User');
const pushService = require('../services/pushService');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        await notification.update({ status: 'Read' });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(400).json({ message: 'Update failed', error: error.message });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await Notification.update(
            { status: 'Read' },
            { where: { userId: req.user.id, status: 'Unread' } }
        );
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(400).json({ message: 'Update failed', error: error.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        await notification.destroy();
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

exports.subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;

        if (!subscription) {
            return res.status(400).json({ message: 'Subscription object is required' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await user.update({ pushSubscription: subscription });

        // Send a test notification to confirm it's working
        await pushService.sendNotification(subscription, {
            title: 'Welcome to MoneyFlow Notifications!',
            body: 'You are now ready to receive real-time financial alerts.',
            icon: '/logo192.png',
            badge: '/logo192.png'
        });

        res.status(201).json({ message: 'Push subscription saved successfully' });
    } catch (error) {
        console.error('Push Subscribe Error:', error);
        res.status(500).json({ message: 'Failed to subscribe to push notifications', error: error.message });
    }
};
