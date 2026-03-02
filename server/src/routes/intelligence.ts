import { Router, Response } from 'express';
import * as db from '../db/queries';
import { performInternetRaid, runManualWeeklyRide, activeRaids } from '../services/raidingService';
import { generateIntelligencePDF } from '../services/pdfService';
import { generateIntelligenceDocx } from '../services/docxService';
import { ApiResponse } from '../types';
import { authenticate, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * GET /api/intelligence/raids
 * Retrieve raid findings for the authenticated user.
 */
router.get('/raids', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt((req.query.limit as string) || '50', 10);
        const results = await db.getRaidResults(userId, limit);

        const response: ApiResponse = {
            success: true,
            data: results,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Intelligence] Raids Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve raids' });
    }
});

/**
 * DELETE /api/intelligence/raids/:id
 */
router.delete('/raids/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.deleteRaidResult(req.params.id as string, userId);
        res.json({ success: true, message: 'Raid result deleted' });
    } catch (error) {
        console.error('[Intelligence] Delete Raid Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete raid result' });
    }
});

/**
 * POST /api/intelligence/raids/bulk-delete
 */
router.post('/raids/bulk-delete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'Invalid IDs' });
        }
        await db.bulkDeleteRaidResults(ids, userId);
        res.json({ success: true, message: `${ids.length} raids deleted` });
    } catch (error) {
        console.error('[Intelligence] Bulk Delete Raids Error:', error);
        res.status(500).json({ success: false, error: 'Bulk delete failed' });
    }
});

/**
 * GET /api/intelligence/reports
 * Retrieve weekly intelligence reports for the authenticated user.
 */
router.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt((req.query.limit as string) || '10', 10);
        const results = await db.getWeeklyReports(userId, limit);

        const response: ApiResponse = {
            success: true,
            data: results,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Intelligence] Reports Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve reports' });
    }
});

/**
 * DELETE /api/intelligence/reports/:id
 */
router.delete('/reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await db.permanentDeleteReport(req.params.id as string, userId);
        res.json({ success: true, message: 'Weekly report deleted' });
    } catch (error) {
        console.error('[Intelligence] Delete Report Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete weekly report' });
    }
});

/**
 * POST /api/intelligence/reports/bulk-delete
 */
router.post('/reports/bulk-delete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'Invalid IDs' });
        }
        await db.bulkDeleteReports(ids, userId);
        res.json({ success: true, message: `${ids.length} reports deleted` });
    } catch (error) {
        console.error('[Intelligence] Bulk Delete Reports Error:', error);
        res.status(500).json({ success: false, error: 'Bulk delete failed' });
    }
});

/**
 * GET /api/intelligence/reports/:id/export
 * Export a weekly report as JSON, PDF, or Word.
 */
router.get('/reports/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const reports = await db.getWeeklyReports(userId, 100);
        const report = reports.find((r: any) => r.id === req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        const format = req.query.format || 'json';

        if (format === 'json') {
            res.setHeader('Content-Disposition', `attachment; filename="intelligence_report_${report.id}.json"`);
            res.setHeader('Content-Type', 'application/json');
            return res.send(JSON.stringify(report, null, 2));
        }

        // Pass full report object for metadata (id, created_at, etc)
        if (format === 'pdf') {
            const filePath = await generateIntelligencePDF(report);
            res.download(filePath, (err) => {
                if (err) console.error('[Intelligence] PDF Download Error:', err);
            });
            return;
        }

        if (format === 'word' || format === 'docx') {
            const filePath = await generateIntelligenceDocx(report);
            res.download(filePath, (err) => {
                if (err) console.error('[Intelligence] Docx Download Error:', err);
            });
            return;
        }

        res.status(400).json({ success: false, error: 'Invalid format' });
    } catch (error) {
        console.error('[Intelligence] Export Error:', error);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

/**
 * GET /api/intelligence/raids/:id/export
 * Export an individual raid finding.
 */
router.get('/raids/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const raids = await db.getRaidResults(userId, 1000);
        const raid = raids.find((r: any) => r.id === req.params.id);

        if (!raid) {
            return res.status(404).json({ success: false, error: 'Finding not found' });
        }

        const format = req.query.format || 'pdf';

        if (format === 'pdf') {
            // Transform raid to match report-like structure for the PDF service
            const exportData = {
                ...raid,
                executive_summary: raid.summary || raid.content,
                id: raid.id,
                created_at: raid.created_at
            };
            const filePath = await generateIntelligencePDF(exportData);
            res.download(filePath, (err) => {
                if (err) console.error('[Intelligence] Raid PDF Download Error:', err);
            });
            return;
        }

        res.status(400).json({ success: false, error: 'Invalid format for individual findings' });
    } catch (error) {
        console.error('[Intelligence] Raid Export Error:', error);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

/**
 * GET /api/intelligence/raid/status
 * Check if a raid is currently active for the user.
 */
router.get('/raid/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const status = activeRaids.get(userId) || { status: 'idle' };
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('[Intelligence] Status Error:', error);
        res.status(500).json({ success: false, error: 'Failed to get raid status' });
    }
});

/**
 * POST /api/intelligence/raid/trigger
 * Manually trigger an intelligence raid.
 */
router.post('/raid/trigger', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const type = (req.body.type as 'mid-week' | 'end-of-week') || 'mid-week';

        if (activeRaids.has(userId)) {
            return res.status(400).json({ success: false, error: 'RAID ALREADY IN PROGRESS: System is currently engaged.' });
        }

        const result = await runManualWeeklyRide(userId);

        res.json({
            success: true,
            message: result.message,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Trigger Error:', error);
        res.status(500).json({ success: false, error: 'Raid trigger failed' });
    }
});

export default router;
