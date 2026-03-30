import { think, getBrainStatus } from './backend/services/openClawService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function finalProof() {
    console.log('--- PROOF OF BRAIN ACTIVITY ---');
    console.log('Current CWD:', process.cwd());
    
    // Test 1: Simple Hello
    console.log('\nTesting Tier 1/2/3 Rotation...');
    try {
        const response = await think("Say 'THE BRAIN IS ALIVE: ' followed by the current model name you are using.", '', { skipSync: true });
        console.log('\n[RESULT FROM AI]:', response.content);
        console.log('[USAGE]:', JSON.stringify(response.usage));
    } catch (e: any) {
        console.error('[CRITICAL FAILURE]:', e.message);
    }

    const status = await getBrainStatus();
    console.log('\n[FINAL CYCLE STATUS]:', status);
}

finalProof();
