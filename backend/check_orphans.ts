import { pool, initDatabase } from './db/connection';

async function checkOrphans() {
    await initDatabase();

    const res = await pool.query('SELECT user_id, count(*) FROM conversations GROUP BY user_id');
    console.log('PostgreSQL Conversations:', res.rows);
    process.exit(0);
}

checkOrphans();
