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

export default router;
