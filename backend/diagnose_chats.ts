import { pool, initDatabase } from './db/connection';

async function diagnose() {
    await initDatabase();
    console.log('--- DIAGNOSIS START ---');

    const users = await pool.query('SELECT id FROM users');
    console.log('PostgreSQL Users:', users.rows);
    const convs = await pool.query('SELECT user_id, count(*) FROM conversations GROUP BY user_id');
    console.log('PostgreSQL Conversations:', convs.rows);

    console.log('--- DIAGNOSIS END ---');
    process.exit(0);
}

diagnose();
