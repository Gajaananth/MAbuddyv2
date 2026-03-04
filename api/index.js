/**
 * Zium Nova Entry Layer v1.7.6 (HARD JS-BRIDGE)
 * Using Pure CommonJS to bypass Vercel ESM/TS build-step conflicts.
 * 🦅🛰️ ZIUM NOVA STABILIZATION PROTOCOL
 */

module.exports = async function handler(req, res) {
    // 1. Hardware Check (Zero imports, zero build risk)
    if (req.url && req.url.includes('health-direct')) {
        return res.status(200).json({
            status: 'online',
            protocol: 'antigravity_direct_cjs_bridge',
            timestamp: new Date().toISOString(),
            version: 'v1.7.6'
        });
    }

    try {
        // 2. Dynamic Entry: Load the server-side engine
        // We use import() because server index.ts is compiled with export default app
        // Even in CJS files, dynamic import() is supported in Node 18+
        const serverModule = await import('../server/src/index');
        const app = serverModule.default || serverModule;

        // 3. Execution Handover
        return app(req, res);
    } catch (error) {
        console.error('[Resilience] BOOT FAILURE:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Zium Nova JS-Bridge Exception',
            details: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join(' ')
        });
    }
};
