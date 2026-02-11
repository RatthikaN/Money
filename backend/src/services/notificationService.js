
const webpush = require('web-push');

// You should generate these using: npx web-push generate-vapid-keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BDE6...';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '...';

webpush.setVapidDetails(
  'mailto:admin@moneyflow.com',
  publicVapidKey,
  privateVapidKey
);

const sendPushNotification = async (subscription, payload) => {
  if (!subscription) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('✅ Push Notification Sent');
  } catch (error) {
    console.error('❌ Push Notification Failed:', error.message);
  }
};

module.exports = { sendPushNotification };
