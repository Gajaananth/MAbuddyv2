import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/connection.js';
import chatRoutes from './routes/chat.js';
import trendsRoutes from './routes/trends.js';
import agentsRoutes from './routes/agents.js';
import memoryRoutes from './routes/memory.js';
import intelligenceRoutes from './routes/intelligence.js';
import notificationRoutes from './routes/notifications.js';
import authRoutes from './routes/auth.js';
import { authenticate } from './middleware/auth.js';
import { initRaidingSchedule } from './services/raidingService.js';

import path from 'path';
import rateLimit from 'express-rate-limit';

if (!process.env.VERCEL) {
    console.log(`[System] Loading environment from local .env...`);
    dotenv.config(); // dotenv automatically looks for .env in process.cwd()
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Rate Limiting ───────────────────────────────────────────
// Limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Middleware ────────────────────────────────────────────────
app.use(limiter);
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://ma-buddy.vercel.app',
            process.env.FRONTEND_URL,
        ];

        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'online',
        agent: 'Zium Nova',
        version: 'v1.8.3',
        protocol: 'antigravity_esm_bond_v4',
        mode: process.env.OPENCLAW_API_KEY ? 'live' : 'demo',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── Resilience Middleware ────────────────────────────────────
// Ensures database is initialized before processing any API requests
// but allows the app to boot instantly.
app.use(async (req, res, next) => {
    if (req.path === '/api/health' || req.path === '/api/auth/diag') return next();

    try {
        await initDatabase();
        next();
    } catch (err: any) {
        console.error('[Resilience] Critical Grid Failure:', err.message);
        res.status(503).json({
            success: false,
            error: 'Grid Offline (Database Timeout)',
            details: err.message
        });
    }
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/trends', authenticate, trendsRoutes);
app.use('/api/agents', authenticate, agentsRoutes);
app.use('/api/memory', authenticate, memoryRoutes);
app.use('/api/intelligence', authenticate, intelligenceRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// ─── Export for Serverless ────────────────────────────────────
export default app;

// ─── Start Server (Local Only) ────────────────────────────────
async function start() {
    await initDatabase();
    initRaidingSchedule();

    if (!process.env.VERCEL) {
        app.listen(PORT, () => {
            console.log('\n  ZIUM NOVA — ONLINE (PORT: ' + PORT + ')\n');
        });
    }
}

if (!process.env.VERCEL) {
    start().catch(console.error);
}
