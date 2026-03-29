import { performInternetRaid } from './services/raidingService';
import db from './db/connection';

const userId = '00000000-0000-0000-0000-000000000000'; // System/Default User

async function trigger() {
    console.log('🚀 Triggering Manual Intelligence Raid...');
    try {
        await performInternetRaid('manual-diagnostic', userId);
        console.log('✅ Raid Completed successfully.');
    } catch (error) {
        console.error('❌ Raid Failed:', error);
    } finally {
        await db.pool.end();
        process.exit(0);
    }
}

trigger();
