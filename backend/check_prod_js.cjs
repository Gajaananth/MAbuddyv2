const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = (process.env.DATABASE_URL || '').trim();
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    console.log('Connecting to:', connectionString ? 'URL present' : 'URL MISSING');
    try {
        const client = await pool.connect();
        console.log('Connected.');
        
        const targetId = 'a1a2ccc0-c3fb-48fc-a440-12192a80d87d';
        
        const c = await client.query('SELECT COUNT(*) FROM conversations WHERE user_id = $1', [targetId]);
        const r = await client.query('SELECT COUNT(*) FROM intelligence_raids WHERE user_id = $1', [targetId]);
        const w = await client.query('SELECT COUNT(*) FROM weekly_reports WHERE user_id = $1', [targetId]);
        
        const orphansC = await client.query("SELECT COUNT(*) FROM conversations WHERE user_id != $1 AND user_id != '00000000-0000-0000-0000-000000000000'", [targetId]);
        const orphansR = await client.query("SELECT COUNT(*) FROM intelligence_raids WHERE user_id != $1 AND user_id != '00000000-0000-0000-0000-000000000000'", [targetId]);

        console.log('--- FINAL AUDIT ---');
        console.log(`Conversations linked to Target: ${c.rows[0].count}`);
        console.log(`Raids linked to Target: ${r.rows[0].count}`);
        console.log(`Weekly Reports linked to Target: ${w.rows[0].count}`);
        console.log(`Orphaned Conversations: ${orphansC.rows[0].count}`);
        console.log(`Orphaned Raids: ${orphansR.rows[0].count}`);
        
        client.release();
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        pool.end();
    }
}

check();
