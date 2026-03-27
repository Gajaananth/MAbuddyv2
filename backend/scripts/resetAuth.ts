import { pool, initDatabase } from '../db/connection';

async function wipe() {
    console.log('[RESET] Initializing database connection...');
    await initDatabase();

    try {
        console.log('[RESET] Wiping PostgreSQL users and devices...');
        await pool.query('TRUNCATE TABLE users CASCADE');
        console.log('[RESET] PostgreSQL wipe complete.');
    } catch (error) {
        console.error('[RESET] No active database connection found.');
        console.error('[RESET] Failure during wipe:', error);
    } finally {
        process.exit(0);
    }
}

wipe();
