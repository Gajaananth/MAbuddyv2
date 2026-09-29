import { Router } from 'express';
import db from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
/**
 * GET /api/learning/logs
 * Returns intelligence logs — what Karuppu has learned from raids and heartbeats.
 */
router.get('/logs', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const limit = parseInt(req.query.limit) || 50;
        const logs = await db.getIntelligenceLogs(userId, limit);
        res.json({ success: true, data: logs, timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('[Learning] Error retrieving intelligence logs:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve learning logs' });
    }
});
/**
 * GET /api/learning/improvements
 * Returns Karuppu's self-improvement history — how she evolves each cycle.
 */
router.get('/improvements', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const limit = parseInt(req.query.limit) || 30;
        const logs = await db.getImprovementLogs(userId, limit);
        res.json({ success: true, data: logs, timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('[Learning] Error retrieving improvement logs:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve improvement logs' });
    }
});
/**
 * GET /api/learning/summary
 * Combined summary: total logs, improvements, top categories.
 */
router.get('/summary', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const [logs, improvements] = await Promise.all([
            db.getIntelligenceLogs(userId, 100),
            db.getImprovementLogs(userId, 50)
        ]);
        const categoryCount = {};
        logs.forEach((l) => {
            categoryCount[l.category] = (categoryCount[l.category] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
        res.json({
            success: true,
            data: {
                total_logs: logs.length,
                total_improvements: improvements.length,
                top_categories: topCategories,
                latest_improvement: improvements[0] || null,
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Learning] Summary error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve summary' });
    }
});
export default router;
