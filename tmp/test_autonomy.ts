import { autonomyService } from '../backend/services/autonomyService.js';
import db from '../backend/db/queries.js';
import { initDatabase } from '../backend/db/connection.js';

async function testAutonomy() {
    console.log('Testing autonomous heartbeat...');
    await initDatabase();
    
    // Get the first user
    const { pool } = await import('../backend/db/connection.js');
    const res = await pool.query('SELECT id FROM users LIMIT 1');
    if (res.rows.length === 0) {
        console.error('No users found.');
        process.exit(1);
    }
    const userId = res.rows[0].id;
    
    console.log(`Triggering performHeartbeatSync for user: ${userId}`);
    
    try {
        await autonomyService.performHeartbeatSync(userId);
        console.log('Success! Heartbeat completed.');
        
        console.log('Fetching recent notifications...');
        const notifs = await db.getNotifications(userId, 3);
        console.log(JSON.stringify(notifs, null, 2));

    } catch (e) {
        console.error('FAILED:', e);
    }
    process.exit(0);
}

testAutonomy();
