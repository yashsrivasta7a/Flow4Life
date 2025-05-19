// src/Utils/NotificationSystem.js
import { subscribeToPushNotifications } from '../serviceWorkerRegistraton';

// Function to request notification permission from the user
export const requestNotificationPermission = async () => {
  // Check if the browser supports notifications
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications");
    return false;
  }

  // Check if permission is already granted
  if (Notification.permission === "granted") {
    try {
      // Try to set up push subscription if we already have permission
      await subscribeToPushNotifications();
    } catch (err) {
      console.warn("Push subscription setup failed:", err);
      // We still have notification permission even if push fails
    }
    return true;
  }

  // Request permission from the user
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // After permission is granted, set up push subscription
      try {
        await subscribeToPushNotifications();
      } catch (err) {
        console.warn("Push subscription setup failed:", err);
        // We still have notification permission even if push fails
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Function to show a browser notification (for foreground notifications)
export const showNotification = (title, body, onClick = null, data = {}) => {
  // Check if the browser supports notifications and permission is granted
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("Notifications are not enabled or permission not granted");
    return;
  }

  // Try to use service worker for notification if available (better for consistency)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: "/notification-icon.png",
        badge: "/notification-badge.png",
        data,
        requireInteraction: false, // Auto close after a while
        actions: [
          {
            action: 'open',
            title: 'Open Chat',
          },
          {
            action: 'close',
            title: 'Dismiss',
          },
        ],
      });
    }).catch(error => {
      console.error("Error showing notification via service worker:", error);
      showFallbackNotification(title, body, onClick);
    });
    return;
  }

  showFallbackNotification(title, body, onClick);
};

// Fallback to standard Notification API if service worker isn't available
const showFallbackNotification = (title, body, onClick) => {
  try {
    // Create and show the notification using the standard API
    const notification = new Notification(title, {
      body,
      icon: "/notification-icon.png",
    });

    // Add click handler if provided
    if (onClick && typeof onClick === "function") {
      notification.onclick = () => {
        window.focus(); // Focus on the window when notification is clicked
        onClick();
      };
    }

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error("Error showing fallback notification:", error);
  }
};

// Function to save notification subscription to your backend
export const saveSubscription = async (subscription, userId) => {
  try {
    const response = await fetch('/api/save-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
};