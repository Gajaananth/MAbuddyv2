import { initDatabase, pool } from './db/connection.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        console.log('--- DATABASE DIAGNOSTIC ---');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
        
        await initDatabase();
        
        const res = await pool.query('SELECT current_database(), current_user');
        console.log('CONNECTED_TO:', res.rows[0]);
        
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES:', tables.rows.map((r: any) => r.table_name).join(', '));
        
        if (tables.rows.some((r: any) => r.table_name === 'users')) {
            const userCount = await pool.query('SELECT count(*) FROM users');
            console.log('USER_COUNT:', userCount.rows[0].count);
        }

        process.exit(0);
    } catch (e: any) {
        console.error('FAIL:', e.message);
        process.exit(1);
    }
}
run();
