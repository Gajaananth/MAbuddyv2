import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.xotpvugfzaqjcdsyctng:2026%21%21Buddy26@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('CONNECTED');
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dob_hash TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        q1_hash TEXT NOT NULL,
        q2_hash TEXT NOT NULL,
        q3_hash TEXT NOT NULL,
        failed_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('TABLE_CREATED');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
