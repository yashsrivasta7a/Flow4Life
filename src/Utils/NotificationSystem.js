// src/utils/notification.js

import { messaging, auth, database, requestMessagingPermissionAndToken } from './Firebase';
import { ref, update, get } from 'firebase/database';
import { onMessage } from 'firebase/messaging';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }

  try {
    // First request basic notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Then request Firebase messaging token
      const token = await requestMessagingPermissionAndToken();
      return !!token;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const showNotification = async (title, options = {}) => {
  if (Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          ...options,
          icon: '/blood.png',
          badge: '/blood.png',
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open'
            }
          ]
        });
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
};

// Set up foreground message handler
export const setupForegroundNotifications = () => {
  onMessage(messaging, (payload) => {
    console.log('Received foreground message:', payload);
    const { notification } = payload;
    if (notification) {
      showNotification(notification.title, {
        body: notification.body,
        data: payload.data
      });
    }
  });
};
