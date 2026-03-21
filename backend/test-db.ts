import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { initDatabase, isPostgresActive } from './db/connection.js';

import fs from 'fs';
const logFile = 'debug_grid.log';
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
const logStream = fs.createWriteStream(logFile, { flags: 'w' });
const originalLog = console.log;
const originalError = console.error;

const logToFile = (args: any[]) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ');
    logStream.write(msg + '\n');
};

console.log = (...args: any[]) => {
    originalLog(...args);
    logToFile(args);
};

console.error = (...args: any[]) => {
    originalError(...args);
    logToFile(['ERROR:', ...args]);
};

async function testConnection() {
    console.log('--- GRID DIAGNOSTIC START ---');
    console.log('Time: ' + new Date().toISOString());
    try {
        await initDatabase();
        if (isPostgresActive) {
            console.log('SUCCESS: Database Grid is ONLINE.');
            setTimeout(() => process.exit(0), 1000);
        } else {
            console.log('FAILURE: Database Grid is OFFLINE (SQLite Fallback Active).');
            setTimeout(() => process.exit(1), 1000);
        }
    } catch (err: any) {
        console.log('CRITICAL ERROR: ' + err.message);
        if (err.stack) console.log('STACK: ' + err.stack);
        setTimeout(() => process.exit(1), 1000);
    }
}

testConnection();
