import type { VercelRequest, VercelResponse } from '@vercel/node';

// IMPORTING THE APP IS THE RISKY PART
// We wrap it in a try/catch if we were using it inside a handler, 
// but exports must be at the top level.
import app from '../server/src/index';

/**
 * Vercel Serverless Function Entry Point
 * 🦅 Zium Nova Resilience Layer v1.7.2
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Immediate Health Response (Bypass Express if testing)
    if (req.url === '/api/health-check-direct') {
        return res.status(200).json({
            status: 'online',
            protocol: 'antigravity_direct',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // 2. Delegate to Express App
        return app(req, res);
    } catch (error: any) {
        console.error('[Vercel Entry] CRITICAL RUNTIME ERROR:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Serverless Runtime Exception',
            details: error.message,
            trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
