import { Router, Response } from 'express';
import db from '../db/queries.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

/**
 * GET /api/notifications
 * List notifications for the authenticated user.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt((req.query.limit as string) || '30', 10);
        const includeRead = req.query.include_read !== 'false';
        const notifications = await db.getNotifications(userId, limit, includeRead);

        const response: ApiResponse = {
            success: true,
            data: notifications,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Notifications] List Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve notifications' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count (for badge).
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { count, hasUrgent } = await db.getUnreadNotificationCount(userId);

        res.json({ success: true, count, hasUrgent });
    } catch (error) {
        console.error('[Notifications] Count Error:', error);
        res.status(500).json({ success: false, error: 'Failed to get count' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read.
 */
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.markNotificationRead(req.params.id as string, userId);

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('[Notifications] Read Error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notification' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Archive a notification.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.archiveNotification(req.params.id as string, userId);

        res.json({ success: true, message: 'Notification archived' });
    } catch (error) {
        console.error('[Notifications] Archive Error:', error);
        res.status(500).json({ success: false, error: 'Failed to archive notification' });
    }
});

/**
 * DELETE /api/notifications
 * Archive all notifications (clear all).
 */
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.archiveAllNotifications(userId);

        res.json({ success: true, message: 'All notifications archived' });
    } catch (error) {
        console.error('[Notifications] Archive All Error:', error);
        res.status(500).json({ success: false, error: 'Failed to clear notifications' });
    }
});

// ──────────────────────────── Push Subscription ────────────────────────────

/**
 * GET /api/notifications/vapid-key
 * Return the VAPID public key for the frontend to use when subscribing.
 */
router.get('/vapid-key', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { getVapidPublicKey } = await import('../services/notificationService.js');
        res.json({ success: true, publicKey: getVapidPublicKey() });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get VAPID key' });
    }
});

/**
 * POST /api/notifications/subscribe
 * Store a push subscription for the authenticated user's device.
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ success: false, error: 'Invalid subscription data' });
        }

        await db.savePushSubscription(userId, deviceId, subscription);
        await db.updateDeviceNotificationStatus(deviceId, true);

        console.log(`[Push] Subscription stored for device ${deviceId} (user: ${userId})`);

        res.json({ success: true, message: 'Push notifications enabled' });
    } catch (error) {
        console.error('[Push] Subscribe Error:', error);
        res.status(500).json({ success: false, error: 'Failed to subscribe' });
    }
});

/**
 * POST /api/notifications/unsubscribe
 * Remove the push subscription for the authenticated user's device.
 */
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.deletePushSubscription(deviceId);
        await db.updateDeviceNotificationStatus(deviceId, false);

        console.log(`[Push] Subscription removed for device ${deviceId} (user: ${userId})`);

        res.json({ success: true, message: 'Push notifications disabled' });
    } catch (error) {
        console.error('[Push] Unsubscribe Error:', error);
        res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
    }
});

export default router;

