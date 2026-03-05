import pkg from 'pg';
const { Pool } = pkg;

// URL-encoding !! as %21%21
const connectionString = 'postgresql://postgres:2026%21%21Buddy26@db.xotpvugfzaqjcdsyctng.supabase.co:6543/postgres?sslmode=require';

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
});

console.log('[Forensic] Probing new grid: xotpvugfzaqjcdsyctng...');
try {
    const client = await pool.connect();
    console.log('[Forensic] Handshake SUCCESSFUL');
    const res = await client.query('SELECT 1');
    console.log('[Forensic] Query Result:', res.rows);
    client.release();
} catch (err) {
    console.error('[Forensic] Handshake FAILED');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    if (err.message.includes('ENOTFOUND')) {
        console.error('DNS ALERT: Hostname could not be found.');
    }
} finally {
    await pool.end();
}
