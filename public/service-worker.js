/* eslint-disable no-undef */


// Cache name for the app
const CACHE_NAME = 'chat-app-cache-v1';

// Assets to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/notification-icon.png',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
  // Ensure the service worker takes control of the page immediately
  self.clients.claim();
});

// Handle fetch requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New message received',
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data: data.data || {},
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
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Message', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
    
    // Fallback to simple notification
    const options = {
      body: 'You have a new message',
      icon: '/notification-icon.png',
    };
    
    event.waitUntil(
      self.registration.showNotification('New Message', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Try to open the chat with the sender
  const chatData = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window client already exists, focus it
        for (const client of clientList) {
          if (client.url.includes('/chat') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        // eslint-disable-next-line no-undef
        if (clients.openWindow) {
          // Include chatId in URL if available
          const url = chatData && chatData.chatId 
            ? `/chat?id=${chatData.chatId}` 
            : '/chat';
            
          // eslint-disable-next-line no-undef
          return clients.openWindow(url);
        }
      })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Subscription expired');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        console.log('Subscribed after expiration', subscription.endpoint);
        // You would send the new subscription to your server here
      })
  );
});