// sw.js
// A more robust service worker for handling notifications reliably.

self.addEventListener('install', () => {
  // Forces the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Ensures that the service worker takes control of the page as soon as it's activated.
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main application.
self.addEventListener('message', (event) => {
  // Check if the message is a request to show a notification.
  if (event.data && event.data.type === 'show-notification') {
    const { title, options } = event.data;
    // We need to use waitUntil to ensure the service worker is not terminated
    // before the notification is shown.
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
  
  // Handle scheduled notifications
  if (event.data && event.data.type === 'schedule-notification') {
    const { id, title, options, fireAt } = event.data;
    const now = Date.now();
    const delay = Math.max(0, fireAt - now);
    
    // Schedule the notification to fire at the exact time
    setTimeout(() => {
      self.registration.showNotification(title, {
        ...options,
        tag: `tabata-${id}`,
        requireInteraction: false,
        silent: false,
      });
    }, delay);
  }
  
  // Handle cancellation of scheduled notifications
  if (event.data && event.data.type === 'cancel-notifications') {
    // Note: setTimeout IDs can't be tracked across service worker restarts
    // So we rely on tag-based replacement instead
  }
});

// Handle notification clicks to bring the app into focus.
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification

  // This focuses the client window if it's already open.
  // If not, it opens a new one.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        // Find the focused window or the first one.
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
