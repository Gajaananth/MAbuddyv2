import dotenv from 'dotenv';
dotenv.config();
// TLS verification enforced - removed NODE_TLS_REJECT_UNAUTHORIZED bypass
import { initDatabase } from './db/connection.js';
import fs from 'fs';
const logFile = 'debug_grid.log';
if (fs.existsSync(logFile))
    fs.unlinkSync(logFile);
const logStream = fs.createWriteStream(logFile, { flags: 'w' });
const originalLog = console.log;
const originalError = console.error;
const logToFile = (args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ');
    logStream.write(msg + '\n');
};
console.log = (...args) => {
    originalLog(...args);
    logToFile(args);
};
console.error = (...args) => {
    originalError(...args);
    logToFile(['ERROR:', ...args]);
};
async function testConnection() {
    console.log('--- GRID DIAGNOSTIC START ---');
    console.log('Time: ' + new Date().toISOString());
    try {
        await initDatabase();
        console.log('SUCCESS: Database Grid (PostgreSQL) is ONLINE.');
        setTimeout(() => process.exit(0), 1000);
    }
    catch (err) {
        console.log('CRITICAL ERROR: ' + err.message);
        if (err.stack)
            console.log('STACK: ' + err.stack);
        setTimeout(() => process.exit(1), 1000);
    }
}
testConnection();
