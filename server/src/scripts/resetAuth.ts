import { pool, sqliteDb, isPostgresActive, initDatabase } from '../db/connection';

async function wipe() {
    console.log('[RESET] Initializing database connection...');
    await initDatabase();

    try {
        if (isPostgresActive) {
            console.log('[RESET] Wiping PostgreSQL users and devices...');
            await pool.query('TRUNCATE TABLE users CASCADE');
            console.log('[RESET] PostgreSQL wipe complete.');
        } else if (sqliteDb) {
            console.log('[RESET] Wiping SQLite users and devices...');
            sqliteDb.prepare('DELETE FROM users').run();
            sqliteDb.prepare('DELETE FROM devices').run();
            console.log('[RESET] SQLite wipe complete.');
        } else {
            console.error('[RESET] No active database connection found.');
        }
    } catch (error) {
        console.error('[RESET] Failure during wipe:', error);
    } finally {
        process.exit(0);
    }
}

wipe();
