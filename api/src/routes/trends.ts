import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { think } from '../services/openClawService.js';
import { applyFilter } from '../filters/silentBeastFilter.js';
import * as db from '../db/queries.js';
import { ApiResponse, TrendData } from '../types/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// In-memory fallback
let trendStore: any[] = [];

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

        const openClawResponse = await think(prompt);
        const filterResult = applyFilter(openClawResponse.content);

        const trendData: TrendData = {
            summary: filterResult.filtered_content,
            fairness_score: filterResult.scores.fairness,
            scam_indicators: filterResult.flags.filter(f => f.includes('SCAM')),
            ethical_opportunities: [],
            recommendations: [],
            unfair_patterns: filterResult.flags.filter(f => f.includes('HYPE')),
        };

        const score = filterResult.scores.overall;
        let savedTrend;

        try {
            savedTrend = await db.saveTrendAnalysis(userId, topic, trendData, score);
        } catch {
            savedTrend = {
                id: uuidv4(),
                topic,
                analysis: trendData,
                score,
                created_at: new Date(),
            };
            trendStore.push(savedTrend);
        }

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

        let trends;
        try {
            trends = await db.getTrendAnalyses(userId, 20);
        } catch {
            trends = trendStore.slice(-20).reverse();
        }

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

export default router;
