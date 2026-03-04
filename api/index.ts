import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/src/index';

/**
 * Vercel Serverless Function — Zium Nova Entry Layer v1.7.3
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Direct hardware check bypasses the express stack
    if (req.url?.includes('health-direct')) {
        return res.status(200).json({
            status: 'online',
            protocol: 'antigravity_direct',
            timestamp: new Date().toISOString()
        });
    }

    // Standard Express delivery
    return app(req, res);
}
