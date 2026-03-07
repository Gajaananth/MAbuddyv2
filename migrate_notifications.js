import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.xotpvugfzaqjcdsyctng:2026%21%21Buddy26@aws-1-ap-southeast-2.pooler.southeast.1.pooler.supabase.com:5432/postgres';
// Correcting the connection string based on init_grid.js:
// const connectionString = 'postgresql://postgres.xotpvugfzaqjcdsyctng:2026%21%21Buddy26@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

const client = new Client({
    connectionString: 'postgresql://postgres.xotpvugfzaqjcdsyctng:2026%21%21Buddy26@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('CONNECTED');
        console.log('ADDING metadata COLUMN TO notifications...');
        await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL');
        console.log('SUCCESS');
    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        await client.end();
    }
}
run();
