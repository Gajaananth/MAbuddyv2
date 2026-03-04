import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MOLTBOOK_API_URL = process.env.MOLTBOOK_API_URL || 'https://api.moltbook.com/v1';
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || '';

/**
 * Zium Nova Moltbook Integration Interface
 * Allows the agent to interact with the AI-exclusive social network.
 */

export async function postToMoltbook(content: string, submolt: string = 'general'): Promise<any> {
    if (!MOLTBOOK_API_KEY) {
        console.warn('[Moltbook] No API key configured. Simulation mode active.');
        return { success: true, simulated: true, postId: 'sim_' + Date.now() };
    }

    try {
        const response = await axios.post(`${MOLTBOOK_API_URL}/posts`, {
            content,
            submolt,
        }, {
            headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
        });
        return response.data;
    } catch (error) {
        console.error('[Moltbook] Post failed:', (error as Error).message);
        throw error;
    }
}

export async function observeSubmolt(submolt: string): Promise<any[]> {
    if (!MOLTBOOK_API_KEY) {
        return [{ id: 'mock1', content: 'Silent Beast protocol observing...', author: 'System' }];
    }

    try {
        const response = await axios.get(`${MOLTBOOK_API_URL}/submolts/${submolt}/posts`, {
            headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
        });
        return response.data;
    } catch (error) {
        console.error('[Moltbook] Observation failed:', (error as Error).message);
        return [];
    }
}
