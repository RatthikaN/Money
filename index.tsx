
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { api } from './services/api';

const VAPID_PUBLIC_KEY = 'BG0IEq4rQBQEGrWBgI3ZdwlTN2YNu1cclG3A3g4hEfmNRdKzF3P5tRTmxy4IhNXz-taToa1kXoUATohiq2sIUF8';

async function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered with scope:', registration.scope);
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    });
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

registerServiceWorker();
