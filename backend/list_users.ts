import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function listUsers() {
    await initDatabase();

    if (isPostgresActive) {
        const res = await pool.query('SELECT id FROM users');
        console.log('PostgreSQL Users:', res.rows);
    } else if (sqliteDb) {
        const rows = sqliteDb.prepare('SELECT id FROM users').all();
        console.log('SQLite Users:', rows);
    }
    process.exit(0);
}

listUsers();
