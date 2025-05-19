
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyD_9kApMf_AotAlYwvSmgY_hd9cOaFsWx0",
    authDomain: "flow4life.firebaseapp.com",
    projectId: "flow4life",
    storageBucket: "flow4life.firebasestorage.app",
    messagingSenderId: "360337861795",
    appId: "1:360337861795:web:1eace881dd5ef5c0762316",
    databaseURL:"https://flow4life-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/blood.png',
    badge: '/blood.png',
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// // Handle notification click
// self.addEventListener('notificationclick', (event) => {
//   console.log('[firebase-messaging-sw.js] Notification clicked', event);
  
//   event.notification.close();
  
//   // This is where you can handle clicks on the notifications
//   // You can direct users to specific pages based on the notification type
//   const urlToOpen = new URL('/', self.location.origin).href;
  
//   const clickData = event.notification.data;
//   let finalUrl = urlToOpen;
  
//   if (clickData) {
//     if (clickData.type === 'chat' && clickData.chatId) {
//       finalUrl = new URL(`/chats?selected=${clickData.chatId}`, self.location.origin).href;
//     } else if (clickData.type === 'blood_request' && clickData.requestId) {
//       finalUrl = new URL(`/request-details/${clickData.requestId}`, self.location.origin).href;
//     }
//   }
  
//   const promiseChain = clients.matchAll({
//     type: 'window',
//     includeUncontrolled: true
//   })
//   .then((windowClients) => {
//     // Check if there is already a window/tab open with the target URL
//     for (let i = 0; i < windowClients.length; i++) {
//       const client = windowClients[i];
//       // If so, focus on it
//       if (client.url === finalUrl && 'focus' in client) {
//         return client.focus();
//       }
//     }
//     // If not, open a new window/tab
//     if (clients.openWindow) {
//       return clients.openWindow(finalUrl);
//     }
//   });
  
//   event.waitUntil(promiseChain);
// });