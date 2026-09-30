import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authService from '../services/authService.js';
import * as webAuthn from '../services/webAuthnService.js';
import { authenticate } from '../middleware/auth.js';
import authQueries from '../db/authQueries.js';
import db from '../db/connection.js';

const router = Router();

// Strict Rate Limiters for sensitive authentication endpoints (C4 / H4)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'TOO_MANY_ATTEMPTS: Too many login attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'TOO_MANY_REGISTRATIONS: Registration rate limit reached.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'TOO_MANY_ATTEMPTS: Too many PIN recovery attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Diagnostic Endpoint (Public, High-level health only)
 */
router.get('/diag', async (_req, res) => {
    const start = Date.now();
    let dbStatus = 'checking';
    let columnCheck = 'unverified';

    try {
        await db.initDatabase();
        dbStatus = 'online';
        
        const colCheck = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'current_challenge'");
        columnCheck = colCheck.rows.length > 0 ? 'exists' : 'missing';
    } catch {
        dbStatus = 'error';
    }

    res.json({
        success: true,
        status: 'diagnostics_complete',
        results: {
            database: dbStatus,
            challenge_column: columnCheck,
            latency_ms: Date.now() - start,
            environment: process.env.VERCEL ? 'vercel_serverless' : 'local_node'
        }
    });
});

/**
 * POST /api/auth/register
 */
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.json({ ...result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'Registration failed.' });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { pin, device, identifiers } = req.body;
        const result = await authService.login({ pin, device, identifiers });
        res.json({ ...result });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message || 'Authentication failed.' });
    }
});

/**
 * POST /api/auth/forgot-pin
 */
router.post('/forgot-pin', forgotPinLimiter, async (req, res) => {
    try {
        const result = await authService.forgotPin(req.body);
        res.json({ ...result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'PIN recovery failed.' });
    }
});

// ──────────────────────────── Protected Management Routes ────────────────────────────

router.post('/change-pin', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        const result = await authService.changePin(userId, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'PIN change failed.' });
    }
});

router.get('/devices', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        const devices = await authQueries.getDevicesByUserId(userId);
        res.json({ success: true, devices });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to retrieve devices.' });
    }
});

router.delete('/devices/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error('Unauthorized');
        await authQueries.removeDevice(req.params.id, userId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message || 'Failed to remove device.' });
    }
});

router.get('/biometrics/register-options', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) throw new Error('Unauthorized');

        const rpID = req.headers.host?.split(':')[0] || 'localhost';

        const devices = await authQueries.getDevicesByUserId(userId);
        const credIds = devices.filter(d => d.credential_id).map(d => d.credential_id);
        const options = await webAuthn.createRegistrationOptions(userId, deviceId, credIds, rpID);
        res.json(options);
    } catch {
        res.status(500).json({ success: false, error: 'REGISTRATION_OPTIONS_ERROR', details: 'Unable to initialize registration options.' });
    }
});

router.post('/biometrics/register-verify', authenticate, async (req, res) => {
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
    } catch (error) {
        console.error('[Biometrics] Registration Verify Error:', error.message);
        res.status(400).json({ 
            success: false, 
            error: 'PROTOCOL_FAILURE', 
            details: error.message || 'Registration verification failed.'
        });
    }
});

router.get('/biometrics/login-options', async (req, res) => {
    try {
        const rpID = req.headers.host?.split(':')[0] || 'localhost';
        const users = await authQueries.getAllUsers();
        let allCreds = [];
        for (const u of users) {
            const devices = await authQueries.getDevicesByUserId(u.id);
            allCreds = [...allCreds, ...devices.filter(d => d.credential_id).map(d => ({ id: d.credential_id }))];
        }

        const options = await webAuthn.createLoginOptions(allCreds, rpID);

        // Associate challenge with device server-side if identifier or fingerprint provided (H3)
        const identifier = req.query.identifier || req.headers['x-device-identifier'];
        const fingerprint = req.query.fingerprint || req.headers['x-device-fingerprint'];
        if (identifier || fingerprint) {
            for (const u of users) {
                const devices = await authQueries.getDevicesByUserId(u.id);
                const matched = devices.find(d =>
                    (identifier && d.device_identifier === identifier) ||
                    (fingerprint && d.fingerprint === fingerprint)
                );
                if (matched) {
                    await authQueries.updateChallenge(matched.id, options.challenge);
                    break;
                }
            }
        }

        res.json(options);
    } catch {
        res.status(500).json({ success: false, error: 'LOGIN_OPTIONS_ERROR', details: 'Unable to initialize biometric options.' });
    }
});

router.post('/biometrics/login-verify', loginLimiter, async (req, res) => {
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
    } catch (error) {
        console.error('[Biometrics] Login Verify Error:', error.message);
        res.status(401).json({ success: false, error: 'AUTHENTICATION_FAILED', details: error.message || 'Biometric authentication failed.' });
    }
});

router.delete('/biometrics', authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const deviceId = req.user?.deviceId;
        if (!userId || !deviceId) throw new Error('Unauthorized');

        await authService.revokeBiometrics(userId, deviceId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Failed to revoke biometrics.' });
    }
});

router.get('/me', authenticate, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Diagnostic & Status endpoints protected by authentication (M1)
router.get('/brain-diag', authenticate, async (_req, res) => {
    try {
        const { getBrainStatus, BUILD_ID } = await import('../services/openClawService.js');
        const status = await getBrainStatus();

        return res.json({
            success: true,
            tier1: {
                configured: !!process.env.OPENROUTER_API_KEY,
                status,
                build: BUILD_ID
            },
            vercel: !!process.env.VERCEL,
            timestamp: new Date().toISOString()
        });
    } catch {
        res.status(500).json({ error: 'Failed to inspect brain status.' });
    }
});

router.get('/status', authenticate, async (_req, res) => {
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
            database: 'PostgreSQL'
        });
    } catch {
        res.status(500).json({ error: 'Failed to retrieve system status.' });
    }
});

export default router;
