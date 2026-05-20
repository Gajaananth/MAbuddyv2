import { ExternalTask } from './types.js';

/**
 * Normalizes raw data from external platforms into the Karuppu standard format.
 */
export function normalizeTask(rawData: any, platform: string): ExternalTask | null {
    try {
        switch (platform.toLowerCase()) {
            case 'moltbook':
                return {
                    id: rawData.post_id || rawData.id,
                    platform: 'moltbook',
                    type: rawData.type || 'engagement',
                    reward: parseFloat(rawData.bounty || rawData.reward || '0'),
                    estimated_time: parseInt(rawData.estimated_time || '5', 10),
                    url: rawData.url || `https://www.moltbook.com/post/${rawData.post_id}`,
                    metadata: rawData.metadata || {}
                };
            case 'generic_crypto_faucet':
                return {
                    id: rawData.task_id,
                    platform: 'generic_crypto_faucet',
                    type: 'click',
                    reward: parseFloat(rawData.payout || '0'),
                    estimated_time: parseInt(rawData.duration_sec || '30', 10) / 60,
                    url: rawData.claim_url,
                    metadata: {}
                };
            // Add future platforms here
            default:
                console.warn(`[Earning Engine] Unknown platform adapter: ${platform}`);
                return null;
        }
    } catch (e) {
        console.error(`[Earning Engine] Failed to normalize task for ${platform}:`, e);
        return null;
    }
}
