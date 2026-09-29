import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true } });
    
    try {
        console.log('--- REMOTE DATABASE DIAGNOSTIC (Vercel Env) ---');
        const res = await pool.query('SELECT current_database(), current_user');
        console.log('CONNECTED_TO:', res.rows[0]);
        
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES:', tables.rows.map((r: any) => r.table_name).join(', '));
        
        process.exit(0);
    } catch (e: any) {
        console.error('FAIL:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
run();
