
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { api } from './services/api';

const VAPID_PUBLIC_KEY = 'BDE6...'; // Placeholder: Replace with real generated key

async function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const startRegistration = async () => {
      // Defer registration to the next event loop tick to ensure document state is stable
      // This specifically resolves "Invalid State" errors in certain sandboxed or proxied environments
      setTimeout(async () => {
        try {
          // Force the URL to be relative to the current origin to avoid domain mismatch errors
          const swUrl = new URL('service-worker.js', window.location.origin).href;
          const registration = await navigator.serviceWorker.register(swUrl);
          console.log('SW Registered successfully with scope:', registration.scope);
          
          // Attempt subscription if user is already logged in
          const token = localStorage.getItem('token');
          if (token) {
            // Small delay to ensure push manager internal state is ready
            setTimeout(() => subscribeUser(registration), 1500);
          }
        } catch (error: any) {
          // Benign error often encountered during rapid hot-reloads/unloading
          if (error.name === 'InvalidStateError') {
            console.warn('Service Worker registration deferred: Document in transition.');
            return;
          }
          console.error('SW Registration failed:', error);
        }
      }, 500);
    };

    // Only register when the document is fully loaded to avoid lifecycle race conditions
    if (document.readyState === 'complete') {
      startRegistration();
    } else {
      window.addEventListener('load', startRegistration);
    }
  }
}

async function subscribeUser(registration: ServiceWorkerRegistration) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });
    }

    // Send subscription to backend using the internal settings API
    await api.settings.update('push-subscription', subscription);
    console.log('Push Subscription Sync Successful');
  } catch (error) {
    console.error('Failed to subscribe to push', error);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initiate service worker registration logic
registerServiceWorker();
