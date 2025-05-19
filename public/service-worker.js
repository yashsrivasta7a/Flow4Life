/* eslint-disable no-undef */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window/tab is already open with the target URL
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open a new tab/window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
