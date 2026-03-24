import { Router, Request, Response } from 'express';
import * as authService from '../services/authService.js';
import * as webAuthn from '../services/webAuthnService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as authQueries from '../db/authQueries.js';
import * as db from '../db/connection.js';

const router = Router();

/**
 * Diagnostic Endpoint (Public)
 */
router.get('/diag', async (_req: Request, res: Response) => {
    const start = Date.now();
    let dbStatus = 'checking';
    let error = null;
    let columnCheck = 'unverified';


    try {
        await db.initDatabase();
        dbStatus = db.isPostgresActive ? 'online' : 'fallback_active';
        
        if (db.isPostgresActive) {
            // More direct check for the column
            const colCheck = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'current_challenge'");
            columnCheck = colCheck.rows.length > 0 ? 'exists' : 'missing';
        }
    } catch (err: any) {
        dbStatus = 'error';
        error = err.message;
    }

    res.json({
        success: true,
        status: 'diagnostics_complete',
        results: {
            database: dbStatus,
            challenge_column: columnCheck,
            latency_ms: Date.now() - start,
            environment: process.env.VERCEL ? 'vercel_serverless' : 'local_node',
            error: error
        }
    });
});


/**
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        res.json({ ...result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { pin, device, identifiers } = req.body;
        const result = await authService.login({ pin, device, identifiers });
        res.json({ ...result });
    } catch (error: any) {
        res.status(401).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/auth/forgot-pin
 */
router.post('/forgot-pin', async (req: Request, res: Response) => {
    try {
        const result = await authService.forgotPin(req.body);
        res.json({ ...result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});



// ──────────────────────────── Protected Management Routes ────────────────────────────

router.post('/change-pin', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        const result = await authService.changePin(userId, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/devices', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        const devices = await authQueries.getDevicesByUserId(userId);
        res.json({ success: true, devices });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/devices/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        await authQueries.removeDevice(req.params.id as string, userId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/biometrics/register-options', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) throw new Error('Unauthorized');

        const rpID = req.headers.host?.split(':')[0] || 'localhost';

        const devices = await authQueries.getDevicesByUserId(userId);
        const credIds = devices.filter(d => d.credential_id).map(d => d.credential_id);
        const options = await webAuthn.createRegistrationOptions(userId, deviceId, credIds, rpID);
        res.json(options);

    } catch (error: any) {
        res.status(500).json({ success: false, error: 'REGISTRATION_OPTIONS_ERROR', details: error.message });
    }
});

router.post('/biometrics/register-verify', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) throw new Error('Unauthorized');

        const rpID = req.headers.host?.split(':')[0] || 'localhost';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const origin = `${protocol}://${req.headers.host}`;

        const verification = await webAuthn.verifyRegistration(userId, deviceId, req.body, origin, rpID);

        if (verification.verified && verification.publicKey && verification.credentialId) {
            await authService.enableBiometrics(userId, deviceId, verification.publicKey, verification.credentialId, verification.counter || 0);
            res.json({ success: true, verified: true });
        } else {
            res.status(400).json({ success: false, error: 'VERIFICATION_FAILED', details: 'Authenticator confirmation rejected.' });
        }
    } catch (error: any) {
        console.error('[Biometrics] Registration Verify Crash:', error);
        res.status(400).json({ 
            success: false, 
            error: 'PROTOCOL_FAILURE', 
            details: error.message,
            stack: error.stack
        });
    }
});

router.get('/biometrics/login-options', async (req: Request, res: Response) => {
    try {
        const rpID = req.headers.host?.split(':')[0] || 'localhost';
        const users = await authQueries.getAllUsers();
        let allCreds: any[] = [];
        for (const u of users) {
            const devices = await authQueries.getDevicesByUserId(u.id);
            allCreds = [...allCreds, ...devices.filter(d => d.credential_id).map(d => ({ id: d.credential_id }))];
        }

        const options = await webAuthn.createLoginOptions(allCreds, rpID);
        res.json(options);
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'LOGIN_OPTIONS_ERROR', details: error.message });
    }
});

router.post('/biometrics/login-verify', async (req: Request, res: Response) => {
    try {
        const { device, biometricResponse, challenge } = req.body;
        const rpID = req.headers.host?.split(':')[0] || 'localhost';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const origin = `${protocol}://${req.headers.host}`;

        const result = await authService.loginBiometric({
            device,
            biometricResponse,
            challenge,
            origin,
            rpID
        });

        res.json(result);
    } catch (error: any) {
        console.error('[Biometrics] Login Verify Crash:', error);
        res.status(401).json({ success: false, error: 'AUTHENTICATION_FAILED', details: error.message });
    }
});

router.delete('/biometrics', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) throw new Error('Unauthorized');

        await authService.revokeBiometrics(userId, deviceId);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {

    res.json({
        success: true,
        user: req.user
    });
});

// Diagnostic: Check system status without auth

router.get('/status', async (_req: Request, res: Response) => {
    try {
        const userCount = await authQueries.getUserCount();
        const deviceCount = await authQueries.getDeviceCount();
        res.json({
            success: true,
            users: userCount,
            devices: deviceCount,
            maxUsers: 5,
            maxDevicesTotal: 17,
            adminDeviceLimit: 5,
            operatorDeviceLimit: 3,
            database: db.isPostgresActive ? 'PostgreSQL' : 'SQLite'
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY: Hard purge for operator reset
router.post('/reset-protocol-data-purge', async (req: Request, res: Response) => {
    try {
        const { secret } = req.body;
        if (secret !== 'nova-purge-2026') return res.status(403).json({ error: 'Unauthorized' });

        const { pool, sqliteDb, isPostgresActive } = db;
        if (db.isPostgresActive) {
            // Postgres cascade wipe — order matters
            await db.pool.query(`
                TRUNCATE TABLE push_subscriptions, devices, notifications,
                messages, conversations, intelligence_raids, weekly_reports,
                trend_analyses, users, agent_network, agent_activity_logs CASCADE
            `);
        } else if (sqliteDb) {
            // SQLite: delete children BEFORE parents (FK order)
            const tables = [
                'push_subscriptions', 'devices', 'notifications',
                'messages', 'conversations',
                'intelligence_raids', 'weekly_reports', 'trend_analyses',
                'agent_activity_logs', 'users'
            ];
            sqliteDb.exec('PRAGMA foreign_keys = OFF');
            sqliteDb.transaction(() => {
                for (const table of tables) {
                    sqliteDb.prepare(`DELETE FROM ${table}`).run();
                }
            })();
            sqliteDb.exec('PRAGMA foreign_keys = ON');
        }
        res.json({ success: true, message: 'FULL PROTOCOL DATA PURGED — SYSTEM READY' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
