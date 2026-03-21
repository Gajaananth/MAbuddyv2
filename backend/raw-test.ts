import dotenv from 'dotenv';
import fs from 'fs';
import { Client } from 'pg';

dotenv.config();

const logFile = 'raw_grid_test.log';
const log = (msg: any) => {
    const text = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
    console.log(text);
    fs.appendFileSync(logFile, text + '\n');
};

if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

async function runTest() {
    log('--- RAW GRID TEST START ---');
    log('TIME: ' + new Date().toISOString());
    log('URL: ' + (process.env.DATABASE_URL ? 'CONFIGURED' : 'MISSING'));
    
    if (!process.env.DATABASE_URL) {
        log('ABORT: No DATABASE_URL found.');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        log('Attempting raw connection...');
        await client.connect();
        log('SUCCESS: Raw Grid Connection Established.');
        
        const res = await client.query('SELECT NOW() as now, current_database() as db');
        log('QUERY TEST: ' + JSON.stringify(res.rows[0]));
        
        await client.end();
        log('Connection closed gracefully.');
    } catch (err: any) {
        log('CRITICAL FAILURE:');
        log('MESSAGE: ' + err.message);
        log('CODE: ' + err.code);
        log('STACK: ' + err.stack);
    }
}

runTest();
