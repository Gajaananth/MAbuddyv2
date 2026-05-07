import { Router, Response } from 'express';
import db from '../db/queries.js';
import { pool } from '../db/connection.js';
import { performInternetRaid, runManualWeeklyRide } from '../services/raidingService.js';
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
 * GET /api/intelligence/reports
 * Retrieve Weekly Reports for the authenticated user.
 */
router.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const limit = parseInt((req.query.limit as string) || '20', 10);
        const reports = await db.getWeeklyReports(userId, limit);

        const response: ApiResponse = {
            success: true,
            data: reports,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    } catch (error) {
        console.error('[Intelligence] Weekly Reports Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve Weekly Reports' });
    }
});

/**
 * GET /api/intelligence/reports/filter
 * Filter Weekly Reports based on criteria.
 */
router.get('/reports/filter', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const filters = {
            topic: req.query.topic as string,
            risk_level: req.query.risk_level as string,
            min_score: req.query.min_score ? parseInt(req.query.min_score as string, 10) : undefined,
            ride_type: req.query.ride_type as string,
            date_start: req.query.date_start as string,
            date_end: req.query.date_end as string,
            status: req.query.status as string,
        };

        const reports = await db.filterReports(userId, filters);

        res.json({
            success: true,
            data: reports,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Filter Reports Error:', error);
        res.status(500).json({ success: false, error: 'Failed to filter Weekly Reports' });
    }
});

/**
 * GET /api/intelligence/reports/:id/download
 * Download a specific report in PDF or DOCX format.
 */
router.get('/reports/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const reportId = req.params.id as string;
        const format = ((req.query.format as string) || 'pdf').toLowerCase();
        const type = ((req.query.type as string) || 'reports').toLowerCase();

        // Retrieve data
        let data: any;
        if (type === 'raids') {
            const results = await db.getRaidResults(userId, 100);
            data = results.find((r: any) => r.id === reportId);
        } else {
            const reports = await db.getWeeklyReports(userId, 100);
            data = reports.find((r: any) => r.id === reportId);
        }

        if (!data) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        let filePath: string;
        let fileName: string;

        if (format === 'pdf') {
            filePath = await generateIntelligencePDF(data);
            fileName = `Nova_Intelligence_${reportId}.pdf`;
        } else if (format === 'docx') {
            filePath = await generateIntelligenceDocx(data);
            fileName = `Nova_Intelligence_${reportId}.docx`;
        } else {
            return res.status(400).json({ success: false, error: 'Invalid format requested' });
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('[Intelligence] Download Error:', err);
            }
            // Cleanup temp file
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        });
    } catch (error) {
        console.error('[Intelligence] Download Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate download' });
    }
});

/**
 * DELETE /api/intelligence/reports/:id
 * Delete a specific weekly report.
 */
router.delete('/reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const reportId = req.params.id as string;
        const permanent = req.query.permanent === 'true';

        if (permanent) {
            await db.permanentDeleteReport(reportId, userId);
        } else {
            await db.softDeleteReport(reportId, userId);
        }

        res.json({
            success: true,
            message: permanent ? 'Report deleted permanently' : 'Report moved to archive',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Delete Report Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
});

/**
 * DELETE /api/intelligence/raids/:id
 * Delete a specific raid result.
 */
router.delete('/raids/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const raidId = req.params.id as string;
        await db.deleteRaidResult(raidId, userId);

        res.json({
            success: true,
            message: 'Raid result deleted',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Delete Raid Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete raid result' });
    }
});

/**
 * POST /api/intelligence/raid/trigger (Alias: /raids/trigger)
 * Trigger a manual internet ride.
 */
router.post(['/raid/trigger', '/raids/trigger'], async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { type } = req.body;

        // Reset status for manual trigger
        const { performInternetRaid } = await import('../services/raidingService.js');
        const { upsertRaidStatus } = await import('../db/queries.js');
        await upsertRaidStatus(userId, {
            status: 'starting',
            current_cluster: 'INIT',
            clusters_completed: 0,
            total_clusters: 5
        });

        // For Vercel, we MUST await the first segment or the process will be killed
        // performInternetRaid handles segmented execution internally
        await performInternetRaid(type === 'end-of-week' ? 'end-of-week' : 'mid-week', userId);

        res.json({
            success: true,
            message: 'Internet ride segment processed successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Manual Raid Error:', error);
        res.status(500).json({ success: false, error: 'Failed to process internet ride segment' });
    }
});

/**
 * GET /api/intelligence/raid/status (Alias: /raids/status)
 * Get the current status of an ongoing internet ride.
 */
router.get(['/raid/status', '/raids/status'], async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { getRaidStatus } = await import('../db/queries.js');
        const status = await getRaidStatus(userId);

        res.json({
            success: true,
            data: status || { status: 'idle', current_cluster: '', clusters_completed: 0, total_clusters: 0 },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Status Error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

/**
 * POST /api/intelligence/report/trigger
 * Trigger a manual weekly report generation.
 */
router.post('/report/trigger', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { runManualWeeklyRide } = await import('../services/raidingService.js');
        // This is non-blocking
        runManualWeeklyRide(userId).catch(err => {
            console.error('[Intelligence] Manual Report Async Error:', err);
        });

        res.json({
            success: true,
            message: 'Intelligence report generation initiated in the background',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Manual Report Error:', error);
        res.status(500).json({ success: false, error: 'Failed to initiate report generation' });
    }
});

/**
 * GET /api/intelligence/logs
 * Get intelligence logs (lessons learned).
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
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Logs Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve intelligence logs' });
    }
});

/**
 * GET /api/intelligence/earnings-stats
 * Returns real stats for the Reports page dashboard widgets.
 * Reads from earnings_log, improvement_logs, and tasks tables.
 */
router.get('/earnings-stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        if (!pool) {
            return res.status(500).json({ success: false, error: 'Database pool not initialized' });
        }

        // Total earnings from earnings_log
        const earningsResult = await pool.query(
            `SELECT COALESCE(SUM(reward), 0) as total, COUNT(*) as count 
             FROM earnings_log WHERE user_id = $1 AND status = 'completed'`,
            [userId]
        ).catch(() => ({ rows: [{ total: 0, count: 0 }] }));

        // Pending tasks count (Opportunity Pipeline)
        const tasksResult = await pool.query(
            `SELECT COUNT(*) as pending FROM tasks 
             WHERE user_id = $1 AND is_archived = FALSE AND status NOT IN ('COMPLETED', 'DONE', 'ARCHIVED')`,
            [userId]
        ).catch(() => ({ rows: [{ pending: 0 }] }));

        // Learning patterns count
        const logsResult = await pool.query(
            `SELECT COUNT(*) as patterns FROM improvement_logs WHERE user_id = $1`,
            [userId]
        ).catch(() => ({ rows: [{ patterns: 0 }] }));

        // Decision confidence: ratio of completed to total tasks
        const confResult = await pool.query(
            `SELECT 
               COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'DONE')) as done,
               COUNT(*) as total
             FROM tasks WHERE user_id = $1`,
            [userId]
        ).catch(() => ({ rows: [{ done: 0, total: 1 }] }));

        const done = parseInt(confResult.rows[0].done) || 0;
        const total = parseInt(confResult.rows[0].total) || 1;
        const confidence = total > 0 ? Math.round((done / total) * 100) : 0;

        res.json({
            success: true,
            data: {
                total_earnings: parseFloat(earningsResult.rows[0].total) || 0,
                earnings_count: parseInt(earningsResult.rows[0].count) || 0,
                pending_tasks: parseInt(tasksResult.rows[0].pending) || 0,
                learning_patterns: parseInt(logsResult.rows[0].patterns) || 0,
                decision_confidence: confidence,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Intelligence] Earnings Stats Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve earnings stats' });
    }
});

export default router;
