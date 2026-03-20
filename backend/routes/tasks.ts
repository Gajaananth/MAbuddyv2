import { Router, Response } from 'express';
import * as db from '../db/queries.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

/**
 * GET /api/tasks
 * Retrieve Command Center tasks for the authenticated user.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const tasks = await db.getTasks(userId);

        const response: ApiResponse = {
            success: true,
            data: tasks,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Tasks] Error retrieving tasks:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve Command Center tasks' });
    }
});

/**
 * GET /api/tasks/progress
 * Real-time task progress statistics (total, completed, in-progress, stuck, by assignee).
 */
router.get('/progress', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const progress = await db.getTaskProgress(userId);

        res.json({
            success: true,
            data: progress,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Tasks] Error retrieving progress:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve task progress' });
    }
});

/**
 * GET /api/tasks/improvements
 * Continuous improvement log — Zium Nova's self-learning history.
 */
router.get('/improvements', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt(req.query.limit as string) || 20;
        const logs = await db.getImprovementLogs(userId, limit);

        res.json({
            success: true,
            data: logs,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Tasks] Error retrieving improvement logs:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve improvement logs' });
    }
});

export default router;
