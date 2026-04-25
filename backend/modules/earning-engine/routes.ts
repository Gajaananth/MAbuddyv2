import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { processEarningOpportunity } from './index.js';

const router = Router();

/**
 * POST /api/earning/opportunity
 * Webhook or client endpoint to ingest new earning opportunities.
 */
router.post('/opportunity', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { rawData, platform, existingPipelineScore } = req.body;

        if (!rawData || !platform) {
            return res.status(400).json({ success: false, error: 'Missing rawData or platform' });
        }

        const scoredTask = await processEarningOpportunity(userId, rawData, platform, existingPipelineScore || 50);

        if (!scoredTask) {
            return res.status(400).json({ success: false, error: 'Failed to normalize or score task' });
        }

        res.json({
            success: true,
            data: scoredTask,
            message: 'Earning opportunity processed and dispatched to Command Center'
        });
    } catch (error: any) {
        console.error('[Earning Engine] Route error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
});

export default router;
