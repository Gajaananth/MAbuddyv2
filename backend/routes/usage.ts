import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getUsageSummaryForUser } from '../services/usageService.js';

const router = Router();

router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const days = Number(req.query.days || 30);
    const summary = await getUsageSummaryForUser(userId, Number.isFinite(days) && days > 0 ? days : 30);

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Usage] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load usage summary',
      details: error.message,
    });
  }
});

export default router;
