import { performInternetRaid } from '../backend/services/raidingService.js';
import db from '../backend/db/queries.js';
import { initDatabase } from '../backend/db/connection.js';

async function testTrigger() {
    await initDatabase();
    
    // Get the first user
    const { pool } = await import('../backend/db/connection.js');
    const res = await pool.query('SELECT id FROM users LIMIT 1');
    if (res.rows.length === 0) {
        console.error('No users found.');
        process.exit(1);
    }
    const userId = res.rows[0].id;
    
    console.log(`Testing manual trigger for user: ${userId}`);
    
    await db.upsertRaidStatus(userId, {
        status: 'starting',
        current_cluster: 'INIT',
        clusters_completed: 0,
        total_clusters: 5
    });

    console.log('Running performInternetRaid...');
    try {
        await performInternetRaid('mid-week', userId);
        console.log('Success! Raid segment completed.');
        const status = await db.getRaidStatus(userId);
        console.log('Current status:', status);
    } catch (e) {
        console.error('FAILED:', e);
    }
    process.exit(0);
}

testTrigger();
