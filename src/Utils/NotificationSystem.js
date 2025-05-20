// src/utils/notification.js

import { messaging, auth, database, requestMessagingPermissionAndToken } from './Firebase';
import { ref, update, get } from 'firebase/database';
import { onMessage } from 'firebase/messaging';

// Request notification permission
export const requestNotificationPermission = async () => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return false;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Show notification with enhanced options
export const showNotification = (title, options = {}) => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    if (Notification.permission === "granted") {
      // Default options
      const defaultOptions = {
        icon: '/flow4life-logo.png', // Replace with your app's logo
        badge: '/flow4life-badge.png', // Replace with your app's badge
        vibrate: [200, 100, 200], // Vibration pattern for mobile devices
        tag: 'flow4life-notification', // Group similar notifications
        requireInteraction: true, // Notification persists until user interacts
        ...options
      };

      // Create and show notification
      const notification = new Notification(title, defaultOptions);

      // Add click handler
      notification.onclick = function(event) {
        event.preventDefault();
        if (options.data?.url) {
          window.focus();
          window.location.href = options.data.url;
        }
        notification.close();
      };

      // Log for debugging
      console.log("Notification sent:", { title, options: defaultOptions });
    }
  } catch (error) {
    console.error("Error showing notification:", error);
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
