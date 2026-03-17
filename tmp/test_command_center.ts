import { initDatabase } from '../backend/db/connection.js';
import { think } from '../backend/services/openClawService.js';

async function test() {
    console.log('Initializing DB...');
    await initDatabase();
    
    const userId = "test-operator-001";
    
    console.log('\n--- TEST 1: Add Task ---');
    const res1 = await think("ADD TASK - Scan Moltbook intelligence signals", "", {}, userId);
    console.log(res1.content);
    
    console.log('\n--- TEST 2: Add Another Task ---');
    const res2 = await think("ADD TASK - Identify AI earning platforms", "", {}, userId);
    console.log(res2.content);
    
    console.log('\n--- TEST 3: Show Board ---');
    const res3 = await think("SHOW COMMAND CENTER", "", {}, userId);
    console.log(res3.content);
    
    console.log('\n--- TEST 4: Update Task ---');
    const res4 = await think("UPDATE TASK - 001 - COMPLETED", "", {}, userId);
    console.log(res4.content);
    
    console.log('\n--- TEST 5: Show Board Again ---');
    const res5 = await think("SHOW COMMAND CENTER", "", {}, userId);
    console.log(res5.content);
}

test().catch(console.error);
