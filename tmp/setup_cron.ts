import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function setupSupabaseCron() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('No DATABASE_URL found in .env');
        return;
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        
        console.log('Enabling pg_net...');
        await client.query('create extension if not exists pg_net;');
        
        console.log('Enabling pg_cron...');
        await client.query('create extension if not exists pg_cron;');

        console.log('Scheduling cron job (karuppu-nova-heartbeat)...');
        
        const frontendUrl = process.env.FRONTEND_URL || 'https://m-abuddyv2.vercel.app';
        const cronSecret = process.env.CRON_SECRET || 'dev_secret_override';

        const sql = `
            select cron.schedule(
              'karuppu-nova-heartbeat',
              '*/30 * * * *',
              $$
                select net.http_get(
                    url:='${frontendUrl}/api/cron',
                    headers:=jsonb_build_object('Authorization', 'Bearer ${cronSecret}')
                );
              $$
            );
        `;

        await client.query(sql);
        console.log('✅ Supabase pg_cron successfully scheduled to run every 30 minutes!');
        
        client.release();
    } catch (err: any) {
        console.error('❌ Failed to set up cron:', err.message);
    } finally {
        await pool.end();
    }
}

setupSupabaseCron();
