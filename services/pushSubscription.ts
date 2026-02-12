import { api } from './api';

const VAPID_PUBLIC_KEY = "BG0IEq4rQBQEGrWBgI3ZdwlTN2YNu1cclG3A3g4hEfmNRdKzF3P5tRTmxy4IhNXz-taToa1kXoUATohiq2sIUF8"; // Matches .env

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUserToPush() {
    try {
        // 1. Check Permissions first
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Permission not granted for notifications');
        }

        const registration = await navigator.serviceWorker.ready;

        // 2. Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // 3. If subscription exists but fails, it might be stale. Try to resubscribe.
        if (subscription) {
            try {
                // Return existing if healthy
                await api.notifications.subscribe(subscription);
                return subscription;
            } catch (e) {
                console.warn('Existing subscription might be stale, attempting fresh subscribe...');
                await subscription.unsubscribe();
            }
        }

        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('✅ Push Subscription successful:', subscription);

        // Send subscription to backend
        await api.notifications.subscribe(subscription);

        return subscription;
    } catch (error: any) {
        console.error('❌ Failed to subscribe user to push:', error);

        // Brave Specific Advice
        const isBrave = (navigator as any).brave !== undefined;
        if (error.name === 'AbortError' && isBrave) {
            console.error('🕵️ Brave detected: Push notifications are blocked by default. Please go to brave://settings/privacy and enable "Use Google services for push messaging".');
        } else if (error.name === 'AbortError') {
            console.error('Hint: Push service error often means the browser cannot reach the push server (GCM/FCM). Try disabling VPNs or checking if you are in Incognito mode.');
        }

        throw error;
    }
}

export async function unsubscribeUserFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            // Optional: Tell backend to remove subscription
            await api.notifications.subscribe(null);
            console.log('✅ Push Unsubscribed');
        }
    } catch (error) {
        console.error('❌ Failed to unsubscribe from push:', error);
    }
}

export async function checkPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
}
