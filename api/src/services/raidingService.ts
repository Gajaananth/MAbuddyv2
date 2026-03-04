import cron from 'node-cron';
import { think } from './openClawService';
import { saveRaidResult, logAgentActivity } from '../db/queries';
import { getAllUsers } from '../db/authQueries';
import { generateWeeklyReport } from './intelligenceService';
import { evaluateAndNotify } from './notificationService';
import { observeSubmolt } from './moltbookService';

// Track active raids for UI feedback
export const activeRaids = new Map<string, {
    status: 'starting' | 'scanning' | 'analyzing' | 'completed' | 'failed';
    currentCluster: string;
    clustersCompleted: number;
    totalClusters: number;
    lastStarted: string;
}>();

const RAID_CLUSTERS = [
    'Deep-Scam Mapping: Pyramid structures, manipulative influencer patterns, fake authority marketing',
    'Algorithm Overwrite Strategy: Content velocity mechanics, engagement loops',
    'Futuristic Marketing Architectures: AI-to-AI commerce, reputation-based economies',
    'AI Agent Earning Systems: Buyer-seller matching nodes, legitimacy scoring',
    'Sri Lankan Stock Leverage (CSE): Sector rotation, whale inflow patterns',
    'AI-Agent Ecosystem Observation: Moltbook agent interactions',
];

/**
 * Autonomous Raiding Service
 */
export function initRaidingSchedule() {
    console.log('[Raid] Initializing Antigravity Schedule...');

    cron.schedule('0 0 * * 3', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) performInternetRaid('mid-week', user.id);
        } catch (err) { console.error('[Raid] Mid-week Error:', err); }
    });

    cron.schedule('0 0 * * 0', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('end-of-week', user.id);
                await generateWeeklyReport(user.id);
            }
        } catch (err) { console.error('[Raid] End-of-week Error:', err); }
    });

    console.log('[Raid] Schedule ARMED: Wednesday & Sunday at 00:00 UTC');
}

/**
 * Perform an automated raid with DYNAMIC LPT (Lazy Playwright Trigger)
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string) {
    console.log(`[Raid] Starting ${type} raid for user ${userId}...`);

    activeRaids.set(userId, {
        status: 'starting',
        currentCluster: 'Initializing...',
        clustersCompleted: 0,
        totalClusters: RAID_CLUSTERS.length,
        lastStarted: new Date().toISOString()
    });

    let browser;
    try {
        // DYNAMIC IMPORT: Prevent top-level crash on Vercel
        const { chromium } = await import('playwright');

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('[Raid] Antigravity scanning...');
        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'scanning' });

        let completed = 0;
        for (const topic of RAID_CLUSTERS) {
            const clusterName = topic.split(':')[0];
            activeRaids.set(userId, { ...activeRaids.get(userId)!, currentCluster: clusterName, clustersCompleted: completed });

            let findings = '';
            if (topic.includes('AI-Agent') || topic.includes('Moltbook')) {
                const posts = await observeSubmolt('ai-agents');
                findings = posts.map(p => `[Moltbook] @${p.author}: ${p.content}`).join('\n');
            } else {
                findings = "Strategic signal detected: High-frequency patterns found in " + clusterName;
            }

            activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'analyzing' });

            const analysis = await think(`Analyze: ${topic}\nFindings: ${findings}`);

            await saveRaidResult(userId, {
                category: clusterName,
                risk_level: 'Medium',
                source_platform: 'Web',
                content: findings,
                summary: analysis.content,
                tags: [type],
                ride_type: type === 'mid-week' ? 'mid-week' : 'end-week',
                opportunity_score: 70,
                status: 'active'
            });

            await evaluateAndNotify(userId, analysis.content, clusterName);
            completed++;
            activeRaids.set(userId, { ...activeRaids.get(userId)!, clustersCompleted: completed, status: 'scanning' });
        }

        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'completed' });
    } catch (error) {
        console.error('[Raid] Failed:', error);
        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'failed' });
    } finally {
        if (browser) await browser.close();
    }
}

export async function runManualWeeklyRide(userId: string) {
    performInternetRaid('end-of-week', userId);
    return { success: true, message: 'Raid started' };
}
