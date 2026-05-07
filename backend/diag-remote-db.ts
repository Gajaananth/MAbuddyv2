import { Pool } from 'pg';

async function run() {
    const connectionString = "postgresql://postgres:gajaan0898%21@db.nyltgmuxvxockuqsqank.supabase.co:5432/postgres";
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    
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
