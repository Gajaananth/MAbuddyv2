import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function diag() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query('SELECT id, user_id, device_identifier, public_key, credential_id FROM devices WHERE public_key IS NOT NULL');
        console.log('--- ENROLLED DEVICES ---');
        res.rows.forEach(r => {
            console.log(`Device ID: ${r.id}`);
            console.log(`Pubkey Length: ${r.public_key?.length}`);
            console.log(`Pubkey Start: ${r.public_key?.slice(0, 20)}...`);
            console.log(`CredID Length: ${r.credential_id?.length}`);
            console.log(`CredID Start: ${r.credential_id?.slice(0, 20)}...`);
            console.log('------------------------');
        });
    } catch (err) {
        console.error('DIAG FAILED:', err);
    } finally {
        await pool.end();
    }
}

diag();
