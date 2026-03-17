import { Router, Response } from 'express';
import * as db from '../db/queries.js';
import { performInternetRaid, runManualWeeklyRide, activeRaids } from '../services/raidingService.js';
import { generateIntelligencePDF } from '../services/pdfService.js';
import { generateIntelligenceDocx } from '../services/docxService.js';
import { ApiResponse } from '../types/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * GET /api/intelligence/raids
 * Retrieve Internet Ride findings for the authenticated user.
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
        console.error('[Intelligence] Internet Ride Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve Internet Ride findings' });
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
        res.json({ success: true, message: 'Internet Ride finding deleted' });
    } catch (error) {
        console.error('[Intelligence] Delete Internet Ride Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete Internet Ride finding' });
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
        res.json({ success: true, message: `${ids.length} Internet Ride findings deleted` });
    } catch (error) {
        console.error('[Intelligence] Bulk Delete Internet Rides Error:', error);
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
 * Export an individual Internet Ride finding.
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
                created_at: raid.created_at,
                source: 'Internet Ride Protocol'
            };
            const filePath = await generateIntelligencePDF(exportData);
            res.download(filePath, (err) => {
                if (err) console.error('[Intelligence] Raid PDF Download Error:', err);
            });
            return;
        }

        res.status(400).json({ success: false, error: 'Invalid format for individual findings' });
    } catch (error) {
        console.error('[Intelligence] Internet Ride Export Error:', error);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

/**
 * GET /api/intelligence/raid/status
 * Check if an Internet Ride is currently active for the user.
 */
router.get('/raid/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const status = activeRaids.get(userId) || { status: 'idle' };
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('[Intelligence] Ride Status Error:', error);
        res.status(500).json({ success: false, error: 'Failed to get Internet Ride status' });
    }
});

/**
 * POST /api/intelligence/raid/trigger
 * Manually trigger a regional/global intelligence scan.
 */
router.post('/raid/trigger', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        console.log(`[Intelligence] DEBUG: RAID_TRIGGER_HIT. User: ${userId}`);
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { type } = req.body;
        console.log(`[Intelligence] Manually triggering ${type || 'standard'} Internet Ride for ${userId}`);
        
        // Use performInternetRaid for standard scans
        performInternetRaid(type || 'mid-week', userId).catch(err => {
            console.error('[Intelligence] Background Raid Error:', err);
        });

        res.json({
            success: true,
            message: 'Internet Ride protocol triggered successfully in background.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Intelligence] Trigger Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error while triggering ride' });
    }
});

/**
 * GET /api/intelligence/logs
 * Retrieve internal intelligence logs (Continuous Learning Protocol).
 */
router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt((req.query.limit as string) || '50', 10);
        const logs = await db.getIntelligenceLogs(userId, limit);

        res.json({
            success: true,
            data: logs,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Intelligence] Logs Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve intelligence logs' });
    }
});

/**
 * POST /api/intelligence/ride
 * Unified endpoint for Internet Ride actions (analyze, report).
 */
router.post('/ride', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { action, userId } = req.body;
        
        // UUID Validation & Fallback
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let targetUserId = (userId && uuidRegex.test(userId)) 
            ? userId 
            : '00000000-0000-0000-0000-000000000000';
            
        // Map common placeholders to System User
        if (targetUserId === '11111111-1111-1111-1111-111111111111') {
            targetUserId = '00000000-0000-0000-0000-000000000000';
        }

        if (action === 'analyze') {
            console.log(`[Intelligence] API Action: Analyze for ${targetUserId}`);
            const result = await runManualWeeklyRide(targetUserId);
            return res.json({
                success: true,
                message: result.message,
                timestamp: new Date().toISOString(),
            });
        }

        if (action === 'report') {
            console.log(`[Intelligence] API Action: Report for ${targetUserId}`);
            const results = await db.getRaidResults(targetUserId, 50);
            return res.json({
                success: true,
                data: results,
                timestamp: new Date().toISOString(),
            });
        }

        res.status(400).json({ success: false, error: 'Invalid action. Use "analyze" or "report".' });
    } catch (error) {
        console.error('[Intelligence] Ride API Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error in Ride API' });
    }
});

export default router;
