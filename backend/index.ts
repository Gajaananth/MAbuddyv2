import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

// Fix for self-signed certificate issues in local development (Supabase).
// This MUST be set before any database pool is created.
if (!process.env.VERCEL) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/connection.js';
import chatRoutes from './routes/chat.js';
import trendsRoutes from './routes/trends.js';
import agentsRoutes from './routes/agents.js';
import memoryRoutes from './routes/memory.js';
import intelligenceRoutes from './routes/intelligence.js';
import notificationRoutes from './routes/notifications.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import earningRoutes from './modules/earning-engine/routes.js';
import learningRoutes from './routes/learning.js';
import { authenticate } from './middleware/auth.js';
import { initRaidingSchedule } from './services/raidingService.js';
import { autonomyService } from './services/autonomyService.js';
import { monitorService } from './services/monitorService.js';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Rate limit is configured but heartbeat will start after DB is ready

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust Vercel Proxy for express-rate-limit
app.set('trust proxy', 1);

// ─── Rate Limiting ───────────────────────────────────────────
// Limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
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
            'http://localhost:5174',
            'http://localhost:5175',
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

import { getBrainStatus } from './services/openClawService.js';

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    const brainLevel = await getBrainStatus();
    const brainStatus = {
        gemini: !!process.env.GEMINI_API_KEY,
        qwen: !!process.env.QWEN_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        moltbook: !!process.env.MOLTBOOK_API_KEY,
    };

    res.json({
        status: 'online',
        agent: 'ZIUM NOVA',
        version: 'v6.0.0',
        brain_status: brainStatus,
        last_brain_cycle: brainLevel,
        mode: brainStatus.gemini || brainStatus.qwen || brainStatus.openai ? 'live' : 'MOCK_ONLY_RED_ALERT',
        message: (!brainStatus.gemini && !brainStatus.qwen && !brainStatus.openai) 
            ? 'CRITICAL: No API keys found! Brain is disabled.' 
            : 'Brain is initialized.',
        timestamp: new Date().toISOString(),
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
        console.error('[Resilience] Critical Grid Failure at path:', req.path);
        console.error('[Resilience] Error:', err.message);
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
app.use('/api/tasks', authenticate, tasksRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/earning', authenticate, earningRoutes);

// ─── Global Error Handler ──────────────────────────────────────
app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Global Error HANDLER]', err);
    res.status(500).json({
        success: false,
        error: 'GRID_FATAL_ERROR',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ─── Export for Serverless ────────────────────────────────────
// ─── Export for Serverless ────────────────────────────────────
export default app;

// ─── Start Server (Local Only) ────────────────────────────────
async function start() {
    await initDatabase();
    initRaidingSchedule();
    monitorService.initMonitor();
    
    if (!process.env.VERCEL) {
        autonomyService.startHeartbeat(30);
    }

    if (!process.env.VERCEL) {
        app.listen(PORT, () => {
            console.log('[Zium Nova] Mission Grid v5.1.5 | GRID RECLAMATION PROTOCOL ACTIVE');
        });
    }
}

if (!process.env.VERCEL) {
    start().catch(console.error);
}
