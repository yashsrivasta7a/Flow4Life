/* eslint-disable no-undef */
// src/serviceWorkerRegistration.js

// This code makes sure the service worker is registered properly for notifications

// Checks if the service worker can be used in this browser
function canUseServiceWorker() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Register the service worker for our app
export function register() {
  if (canUseServiceWorker()) {
    // Use Vite environment variables
    const publicUrl = new URL(import.meta.env.VITE_PUBLIC_URL || '/', window.location.href);

    // Make sure we're not being fooled by a cross-origin issue
    if (publicUrl.origin !== window.location.origin) {
      console.warn('Service worker won\'t work due to cross-origin restriction');
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.VITE_PUBLIC_URL || ''}/service-worker.js`;
      registerServiceWorker(swUrl);
    });
  } else {
    console.log('This browser does not support service workers or push notifications');
  }
}

// Register our service worker and attempt to subscribe to push notifications
function registerServiceWorker(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);

      // Check for updates periodically
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available; please refresh
              console.log('New content is available; please refresh');
            } else {
              // Content is cached for offline use
              console.log('Content is cached for offline use');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

// Subscribe to push notifications
export function subscribeToPushNotifications() {
  if (!canUseServiceWorker()) {
    return Promise.reject('Push notifications not supported');
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  console.log('Using VAPID public key:', vapidKey);

  return navigator.serviceWorker.ready
    .then((registration) => {
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    })
    .then((subscription) => {
      console.log('User is subscribed to push notifications:', subscription);
      return subscription;
    })
    .catch((error) => {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    });
}

// Unsubscribe from push notifications
export function unsubscribeFromPushNotifications() {
  if (!canUseServiceWorker()) {
    return Promise.reject('Push notifications not supported');
  }

  return navigator.serviceWorker.ready
    .then((registration) => {
      return registration.pushManager.getSubscription();
    })
    .then((subscription) => {
      if (subscription) {
        return subscription.unsubscribe();
      }
      return false;
    })
    .then((successful) => {
      if (successful) {
        console.log('User unsubscribed from push notifications');
      }
      return successful;
    })
    .catch((error) => {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    });
}

// Helper function to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
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

// Unregister the service worker
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Error unregistering service worker:', error);
      });
  }
}
