import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { think } from '../services/openClawService.js';
import { applyFilter } from '../filters/silentBeastFilter.js';
import db from '../db/queries.js';
import { getTrendAggregation, getSecurityLogs } from '../db/queries.js';
import { ApiResponse, TrendData } from '../types/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { eventService, ZiumEvent } from '../services/eventService.js';

const router = Router();

// No fallbacks allowed. Grid must be persistent.

/**
 * POST /api/trends/analyze
 * Analyze a topic/trend through Zium Nova's lens.
 */
router.post('/analyze', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { topic } = req.body;

        if (!topic || typeof topic !== 'string') {
            const response: ApiResponse = {
                success: false,
                error: 'Topic is required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }

        const prompt = `Analyze this market/social trend as Zium Nova (Silent Beast mode):

TOPIC: "${topic}"

Provide a structured analysis with:
1. Summary of the trend
2. Fairness score (0-100): How fair is this trend to skilled, ethical contributors?
3. Scam indicators: Any signs of manipulation, fake influence, or pyramid structures?
4. Ethical opportunities: How can ethical actors win in this space?
5. Recommendations: 3-5 actionable steps
6. Unfair patterns: What systemic issues disadvantage honest creators?

Be brutally honest. No hype. Data-driven. Expose manipulation.`;

        const openClawResponse = await think(prompt, [], { mode: 'STRATEGIC' }, userId);
        const filterResult = await applyFilter(openClawResponse.content, userId, { skipStrategicAudit: true });

        const trendData: TrendData = {
            summary: filterResult.filtered_content,
            fairness_score: filterResult.scores.fairness,
            scam_indicators: filterResult.flags.filter(f => f.includes('SCAM')),
            ethical_opportunities: [],
            recommendations: [],
            unfair_patterns: filterResult.flags.filter(f => f.includes('HYPE')),
        };

        const score = filterResult.scores.overall;
        // Derive cluster from first meaningful word of topic (uppercase)
        const cluster = topic.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'CORE';
        const savedTrend = await db.saveTrendAnalysis(userId, topic, trendData, score, cluster);

        eventService.emitZium(ZiumEvent.TREND_UPDATED, {
            userId,
            topic,
            score,
            cluster: cluster
        });

        const response: ApiResponse = {
            success: true,
            data: {
                trend: savedTrend,
                filter_scores: filterResult.scores,
                flags: filterResult.flags,
            },
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Trends] Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

/**
 * GET /api/trends
 * Retrieve past trend analyses for the authenticated user.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const trends = await db.getTrendAnalyses(userId, 20);

        const response: ApiResponse = {
            success: true,
            data: trends,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Trends] Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

/**
 * DELETE /api/trends/:id
 * Delete a specific trend analysis.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { id } = req.params;

        await db.deleteTrendAnalysis(id as string, userId);

        const response: ApiResponse = {
            success: true,
            data: { id },
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Trends] Delete Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});

/**
 * GET /api/trends/aggregation
 * Returns aggregated trend intelligence grouped by cluster.
 */
router.get('/aggregation', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const aggregation = await getTrendAggregation(userId);
        res.json({ success: true, data: aggregation, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[Trends] Aggregation Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/trends/security-logs
 * Returns the real-time security audit trail for the Security Vault.
 */
router.get('/security-logs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const logs = await getSecurityLogs(userId, 30);
        res.json({ success: true, data: logs, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[Trends] Security Logs Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
