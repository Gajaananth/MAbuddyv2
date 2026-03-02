/**
 * Push Notification Service — Zium Nova
 * Handles service worker registration, permission requests, and push subscription management.
 * RULE: Never request permission automatically. Only after user interaction.
 */

import api from './api';

// ──────────────────────────── Helpers ────────────────────────────

/**
 * Convert a base64 URL-safe string to a Uint8Array (for VAPID keys).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// ──────────────────────────── Status Checks ────────────────────────────

/**
 * Check if the browser supports push notifications.
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Check if running as an installed PWA (standalone mode).
 */
export function isStandalonePWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
}

/**
 * Detect if device is iOS.
 */
export function isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if iOS meets PWA requirement for push.
 */
export function isIOSPushReady(): boolean {
    if (!isIOS()) return true; // Not iOS, no restriction
    return isStandalonePWA(); // iOS requires Add to Home Screen
}

/**
 * Get the current notification permission status.
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

// ──────────────────────────── Core Flow ────────────────────────────

/**
 * Request notification permission (ONLY call on user interaction).
 */
export async function requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    return await Notification.requestPermission();
}

/**
 * Register the service worker and subscribe to push notifications.
 * Returns true if successful.
 */
export async function subscribeToPush(): Promise<boolean> {
    try {
        // Step 1: Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Step 2: Get VAPID public key from backend
        const keyRes = await api.get('/api/notifications/vapid-key');
        const vapidPublicKey = keyRes.data.publicKey;
        if (!vapidPublicKey) {
            console.error('[Push] No VAPID public key received');
            return false;
        }

        // Step 3: Subscribe via PushManager
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });

        // Step 4: Send subscription to backend
        await api.post('/api/notifications/subscribe', { subscription: subscription.toJSON() });

        console.log('[Push] Subscription activated successfully');
        return true;
    } catch (err) {
        console.error('[Push] Subscription failed:', err);
        return false;
    }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }

        await api.post('/api/notifications/unsubscribe');
        console.log('[Push] Unsubscribed successfully');
        return true;
    } catch (err) {
        console.error('[Push] Unsubscribe failed:', err);
        return false;
    }
}

/**
 * Show a local confirmation notification (not a push — triggered directly).
 */
export function showLocalNotification(title: string, body: string): void {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/zn-icon-192.png',
        });
    }
}
