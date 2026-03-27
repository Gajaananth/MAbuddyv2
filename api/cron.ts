import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDatabase } from '../backend/db/connection.js';
import { getAllUsers } from '../backend/db/authQueries.js';
import { autonomyService } from '../backend/services/autonomyService.js';

/**
 * Zium Nova — Vercel Cron Heartbeat
 * Runs every 30 minutes to keep Nova alive and proactive.
 * Protected by CRON_SECRET environment variable.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Vercel automatically sends Authorization header for cron jobs
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    // Only allow GET from Vercel cron (or direct call with secret for testing)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[Cron] Unauthorized attempt blocked.');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const startTime = Date.now();
    console.log('[Cron] ⚡ Zium Nova Heartbeat Triggered at:', new Date().toISOString());

    try {
        await initDatabase();
        const users = await getAllUsers();
        console.log(`[Cron] Processing ${users.length} user(s)...`);

        // Run all users in parallel for speed (Vercel has 60s function timeout)
        const results = await Promise.allSettled(
            users.map(user => autonomyService.performHeartbeatSync(user.id))
        );

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        const duration = Date.now() - startTime;
        console.log(`[Cron] ✅ Cycle complete. ${succeeded} succeeded, ${failed} failed. Duration: ${duration}ms`);

        return res.status(200).json({
            success: true,
            users_processed: users.length,
            succeeded,
            failed,
            duration_ms: duration,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[Cron] ❌ Heartbeat failure:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
}
