import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function diagnose() {
    await initDatabase();
    console.log('--- DIAGNOSIS START ---');

    if (isPostgresActive) {
        const users = await pool.query('SELECT id FROM users');
        console.log('PostgreSQL Users:', users.rows);
        const convs = await pool.query('SELECT user_id, count(*) FROM conversations GROUP BY user_id');
        console.log('PostgreSQL Conversations:', convs.rows);
    } else if (sqliteDb) {
        const users = sqliteDb.prepare('SELECT id FROM users').all();
        console.log('SQLite Users:', users);
        const convs = sqliteDb.prepare('SELECT user_id, count(*) as count FROM conversations GROUP BY user_id').all();
        console.log('SQLite Conversations:', convs);
    }

    console.log('--- DIAGNOSIS END ---');
    process.exit(0);
}

diagnose();
