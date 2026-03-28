import { think } from './backend/services/openClawService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing think()...');
    const res = await think('test prompt');
    console.log('Final Result:', res);
    
    // Also check failure history
    const { getBrainStatus } = await import('./backend/services/openClawService.js');
    console.log('Brain Status:', await getBrainStatus());
}
test();
