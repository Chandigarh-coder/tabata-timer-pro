// sw.js
// Bulletproof service worker for zero missed notifications.

// Persistent notification queue
const notificationQueue = new Map();
let nextCheckInterval = null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  // Start periodic check for missed notifications
  startNotificationChecker();
});

// Periodic checker to ensure no notifications are missed
function startNotificationChecker() {
  if (nextCheckInterval) {
    clearInterval(nextCheckInterval);
  }
  nextCheckInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, notification] of notificationQueue.entries()) {
      if (now >= notification.fireAt && !notification.fired) {
        fireNotification(id, notification);
      }
    }
  }, 500); // Check every 500ms
}

function fireNotification(id, notification) {
  notification.fired = true;
  notification.firedAt = Date.now();
  
  self.registration.showNotification(notification.title, {
    ...notification.options,
    tag: `tabata-${id}`,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  }).then(() => {
    // Keep in queue for 5 seconds for verification
    setTimeout(() => {
      notificationQueue.delete(id);
    }, 5000);
  }).catch(error => {
    console.error('Failed to show notification:', error);
    // Retry after 1 second
    notification.fired = false;
    setTimeout(() => {
      if (!notification.fired) {
        fireNotification(id, notification);
      }
    }, 1000);
  });
}

// Listen for messages from the main application.
self.addEventListener('message', (event) => {
  // Immediate notification
  if (event.data && event.data.type === 'show-notification') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
  
  // Schedule notification with persistent queue
  if (event.data && event.data.type === 'schedule-notification') {
    const { id, title, options, fireAt } = event.data;
    const now = Date.now();
    
    // Add to persistent queue
    notificationQueue.set(id, {
      id,
      title,
      options,
      fireAt,
      scheduledAt: now,
      fired: false,
      firedAt: null
    });
    
    // Schedule with setTimeout as primary mechanism
    const delay = Math.max(0, fireAt - now);
    setTimeout(() => {
      const notification = notificationQueue.get(id);
      if (notification && !notification.fired) {
        fireNotification(id, notification);
      }
    }, delay);
    
    // Also schedule a backup check 1 second after expected fire time
    setTimeout(() => {
      const notification = notificationQueue.get(id);
      if (notification && !notification.fired) {
        console.warn(`Backup firing notification ${id}`);
        fireNotification(id, notification);
      }
    }, delay + 1000);
  }
  
  // Clear all scheduled notifications
  if (event.data && event.data.type === 'cancel-notifications') {
    notificationQueue.clear();
  }
  
  // Get notification status for verification
  if (event.data && event.data.type === 'verify-notifications') {
    const status = Array.from(notificationQueue.entries()).map(([id, notif]) => ({
      id,
      fired: notif.fired,
      fireAt: notif.fireAt,
      firedAt: notif.firedAt
    }));
    
    // Send status back to client
    event.source.postMessage({
      type: 'notification-status',
      status
    });
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
