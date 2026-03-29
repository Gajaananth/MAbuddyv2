import { Router, Response } from 'express';
import db from '../db/queries.js';
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

        const showArchived = req.query.archived === 'true';
        const tasks = await db.getTasks(userId, showArchived);

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
 * PATCH /api/tasks/:id
 * Update a specific task's status or details.
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const id = String(req.params.id);
        const { status, notes } = req.body;

        const updatedTask = await db.updateTaskStatus(userId, id, status, notes);

        res.json({
            success: true,
            data: updatedTask,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Tasks] Update Error:', error);
        res.status(500).json({ success: false, error: 'Failed to update task' });
    }
});

/**
 * PATCH /api/tasks/:id/archive
 */
router.patch('/:id/archive', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const id = String(req.params.id);
        const { is_archived } = req.body;

        const updatedTask = await db.archiveTask(userId, id, is_archived);

        res.json({ success: true, data: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to archive task' });
    }
});

/**
 * PATCH /api/tasks/:id/assign
 */
router.patch('/:id/assign', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const id = String(req.params.id);
        const { assigned_to } = req.body;

        const updatedTask = await db.updateTaskAssignment(userId, id, assigned_to);

        res.json({ success: true, data: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update assignment' });
    }
});

/**
 * DELETE /api/tasks/:id
 * Remove a mission from the grid.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const id = String(req.params.id);
        await db.deleteTask(id, userId);

        res.json({
            success: true,
            data: { id },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Tasks] Delete Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete task' });
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
