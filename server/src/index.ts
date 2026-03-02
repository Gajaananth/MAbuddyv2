import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/connection';
import chatRoutes from './routes/chat';
import trendsRoutes from './routes/trends';
import agentsRoutes from './routes/agents';
import memoryRoutes from './routes/memory';
import intelligenceRoutes from './routes/intelligence';
import notificationRoutes from './routes/notifications';
import authRoutes from './routes/auth';
import { authenticate } from './middleware/auth';
import { initRaidingSchedule } from './services/raidingService';

import path from 'path';
import rateLimit from 'express-rate-limit';

const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

console.log(`[System] Loading environment from: ${envPath}`);
if (result.error) {
    console.error(`[System] Failed to load .env: ${result.error.message}`);
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
        mode: process.env.OPENCLAW_API_KEY ? 'live' : 'demo',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
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

// ─── Start Server ─────────────────────────────────────────────
async function start() {
    // Initialize Database (attempts Postgres, falls back to SQLite)
    await initDatabase();

    // Start Autonomous Raiding Engine
    initRaidingSchedule();

    app.listen(PORT, () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════════╗');
        console.log('  ║           ZIUM NOVA — ONLINE             ║');
        console.log('  ║                                          ║');
        console.log('  ║   Silent Beast Protocol: ACTIVE          ║');
        console.log('  ║   Truth Exposer: ARMED                   ║');
        console.log(`  ║   Mode: ${process.env.OPENCLAW_API_KEY || process.env.OPENROUTER_API_KEY ? 'LIVE          ' : 'DEMO (no API key)'}              ║`);
        console.log(`  ║   Port: ${PORT}                              ║`);
        console.log('  ║                                          ║');
        console.log('  ║   "Observe. Analyze. Act with purpose."  ║');
        console.log('  ╚══════════════════════════════════════════╝');
        console.log('');
    });
}

start().catch(console.error);
