// src/utils/notification.js

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    });
  }
};
