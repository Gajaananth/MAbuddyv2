/**
 * Zium Nova — Service Worker
 * Handles push notifications and notification click events.
 */

// Push event — display the notification
self.addEventListener('push', function (event) {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = {
            title: 'ZIUM NOVA',
            body: event.data.text(),
        };
    }

    const options = {
        body: payload.body || 'New intelligence signal detected.',
        icon: '/zn-icon-192.png',
        badge: '/zn-badge-72.png',
        tag: payload.tag || 'zium-nova-alert',
        data: payload.data || {},
        vibrate: [100, 50, 100],
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(payload.title || 'ZIUM NOVA', options)
    );
});

// Notification click — focus or open the app
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus existing tab if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Activate immediately
self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});
