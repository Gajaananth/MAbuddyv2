import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function checkOrphans() {
    await initDatabase();

    if (isPostgresActive) {
        const res = await pool.query('SELECT user_id, count(*) FROM conversations GROUP BY user_id');
        console.log('PostgreSQL Conversations:', res.rows);
    } else if (sqliteDb) {
        const rows = sqliteDb.prepare('SELECT user_id, count(*) as count FROM conversations GROUP BY user_id').all();
        console.log('SQLite Conversations:', rows);
    } else {
        console.log('No database connection available.');
    }
    process.exit(0);
}

checkOrphans();
