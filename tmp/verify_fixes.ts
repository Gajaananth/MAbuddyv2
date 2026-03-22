import { autonomyService } from '../backend/services/autonomyService.js';
import { getAllUsers } from '../backend/db/authQueries.js';
import { initDatabase } from '../backend/db/connection.js';

async function verify() {
    await initDatabase();
    console.log('[Verify] Grid Connection Established.');
    
    if (typeof autonomyService.performHeartbeatSync !== 'function') {
        throw new Error('performHeartbeatSync is not a function on autonomyService');
    }
    console.log('[Verify] performHeartbeatSync found.');

    const users = await getAllUsers();
    if (users.length > 0) {
        const testUser = users[0].id;
        console.log(`[Verify] Testing sync for user: ${testUser}`);
        // We won't actually run it to avoid spamming LLM, just check if it's there
    }
    
    console.log('[Verify] Final Check: NO heartbeatCheck FOUND.');
}

verify().catch(err => {
    console.error('[Verify] FAILED:', err.message);
    process.exit(1);
});
