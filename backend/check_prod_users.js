import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const connectionString = (process.env.DATABASE_URL || '').trim();
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true }
});
async function check() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT id, created_at FROM users');
        console.log('Production Users:', JSON.stringify(res.rows, null, 2));
        client.release();
    }
    catch (err) {
        console.error('Check failed:', err.message);
    }
    finally {
        pool.end();
    }
}
check();
