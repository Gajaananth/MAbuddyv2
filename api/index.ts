import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function — Zium Nova Entry Layer v1.7.4
 * Protocol: Dynamic Isolation Mode
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Direct hardware check (Safe, no imports)
    if (req.url?.includes('health-direct')) {
        return res.status(200).json({
            status: 'online',
            protocol: 'antigravity_direct',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // 2. Dynamic Import: Isolate the server module load
        // If a module (like playwright or native C++ addon) crashes during load, 
        // we catch it here instead of letting the whole function fail.
        const serverModule = await import('../server/src/index');
        const app = serverModule.default;

        return app(req, res);
    } catch (error: any) {
        console.error('[Resilience] CRITICAL BOOT FAILURE:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Zium Nova Boot Exception',
            details: error.message,
            advice: 'Check for missing environment variables or native module crashes.'
        });
    }
}
