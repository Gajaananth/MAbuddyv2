import { think } from './backend/services/openClawService.js';
import { initDatabase } from './backend/db/connection.js';

async function test() {
    await initDatabase();
    console.log('Sending message to OpenClaw...');
    try {
        const res = await think('test message', '', {}, 'system_autonomous_operator');
        console.log('Response:', res);
    } catch (e) {
        console.error('Test failed:', e);
    }
    process.exit(0);
}

test();
