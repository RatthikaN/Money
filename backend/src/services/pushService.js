const webpush = require('web-push');
require('dotenv').config();

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const pushService = {
    /**
     * Send a push notification to a specific user subscription
     * @param {Object} subscription - The push subscription object from the client
     * @param {Object} payload - The notification payload (title, body, etc.)
     */
    sendNotification: async (subscription, payload) => {
        try {
            if (!subscription) return;

            const payloadString = JSON.stringify(payload);
            await webpush.sendNotification(subscription, payloadString);
            console.log('✅ [Push] Notification sent successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ [Push] Error sending notification:', error);
            // If subscription is expired or invalid (404 or 410), we should ideally remove it
            if (error.statusCode === 404 || error.statusCode === 410) {
                console.log('⚠️ [Push] Subscription expired or removed');
                return { success: false, expired: true };
            }
            return { success: false, error: error.message };
        }
    }
};

module.exports = pushService;
