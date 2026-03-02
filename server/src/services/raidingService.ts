import cron from 'node-cron';
import { chromium } from 'playwright';
import { think } from './openClawService';
import { saveRaidResult, createNotification, logAgentActivity } from '../db/queries';
import { getAllUsers } from '../db/authQueries';
import { generateWeeklyReport } from './intelligenceService';
import { notifyStrategicSignal, detectStrategicBreach, evaluateAndNotify } from './notificationService';
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
    'Deep-Scam Mapping: Pyramid structures, manipulative influencer patterns, fake authority marketing, recruitment-based return models',
    'Algorithm Overwrite Strategy: Content velocity mechanics, engagement loops, AI amplification detection, platform reward bias',
    'Futuristic Marketing Architectures: AI-to-AI commerce, reputation-based economies, decentralized discovery engines',
    'AI Agent Earning Systems: Buyer-seller matching nodes, legitimacy scoring, autonomous affiliate ecosystems, value-based agents',
    'Sri Lankan Stock Leverage (CSE): Sector rotation, whale inflow patterns, undervalued energy/tech sectors, local-to-global scalability hubs',
    'AI-Agent Ecosystem Observation: Moltbook agent interactions, autonomous earning patterns, manipulative agent detection, futuristic social commerce signals',
];

/**
 * Autonomous Raiding Service
 * Schedules and executes internet "raids" for strategic intelligence.
 */
export function initRaidingSchedule() {
    console.log('[Raid] Initializing Antigravity Strategic Intelligence Schedule...');

    // Mid-week Raid: Wednesday 00:00
    cron.schedule('0 0 * * 3', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                performInternetRaid('mid-week', user.id);
            }
        } catch (err) {
            console.error('[Raid] Mid-week Error:', err);
        }
    });

    // End-of-week Raid: Sunday 00:00 (followed by report generation)
    cron.schedule('0 0 * * 0', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('end-of-week', user.id);
                await generateWeeklyReport(user.id);
            }
        } catch (err) {
            console.error('[Raid] End-of-week Error:', err);
        }
    });

    console.log('[Raid] Schedule ARMED: Wednesday & Sunday at 00:00 UTC (Antigravity Mode)');
}

/**
 * Perform an automated raid to detect scams and market patterns.
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string) {
    console.log(`[Raid] Starting ${type} Antigravity raid for user ${userId}...`);

    activeRaids.set(userId, {
        status: 'starting',
        currentCluster: 'Initializing...',
        clustersCompleted: 0,
        totalClusters: RAID_CLUSTERS.length,
        lastStarted: new Date().toISOString()
    });

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        console.log('[Raid] Scanning for Antigravity patterns...');
        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'scanning' });

        let completed = 0;
        for (const topic of RAID_CLUSTERS) {
            const clusterName = topic.split(':')[0];
            console.log(`[Raid] Investigating cluster: ${clusterName}`);

            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                currentCluster: clusterName,
                clustersCompleted: completed
            });

            let findings = '';

            // Branch logic based on cluster type
            if (topic.includes('AI-Agent') || topic.includes('Moltbook')) {
                console.log('[Raid] Observing AI-Agent ecosystems...');
                const posts = await observeSubmolt('ai-agents');
                findings = posts.map(p => `[Moltbook] @${p.author || 'unknown'}: ${p.content}`).join('\n');
            } else {
                findings = await simulateScraper(topic);
            }

            activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'analyzing' });

            // Securely log the strategic action
            await logAgentActivity({
                action_type: 'STRATEGIC_SCAN',
                platform: 'INTERNET',
                details: `Investigated cluster: ${clusterName} for topic: ${topic}`,
                metadata: { userId, type, cluster: clusterName }
            });

            // Process findings with Zium Nova's brain
            const analysis = await think(`ZIUM NOVA – ANTIGRAVITY RAID EXECUTION
Analyze these raw findings for "${topic}".

MISSION DIRECTIVES:
1. Detect and expose deep-scam networks and manipulative influencer patterns (Explain the structural logic).
2. Identify futuristic marketing strategies and algorithm weaknesses for ethical advantage.
3. Analyze Sri Lankan stock trends (CSE) for sector rotation and whale flow signals.
4. Observe AI-agent behaviors for autonomous earning opportunities.
5. NO generic statements. Connect every insight to earning, risk mitigation, or strategic positioning.

Raw Findings:
${findings}`);

            // Save to database
            await saveRaidResult(userId, {
                category: clusterName,
                risk_level: analysis.content.toLowerCase().includes('high risk') || analysis.content.toLowerCase().includes('flag') ? 'High' : 'Medium',
                source_platform: topic.includes('Moltbook') ? 'Moltbook' : 'Web Search',
                content: findings,
                summary: analysis.content,
                tags: [type, 'raid', 'weekly_ride_mission', clusterName.split(' ')[0]],
                ride_type: type === 'mid-week' ? 'mid-week' : 'end-week',
                opportunity_score: analysis.content.match(/Opportunity Score:?\s*(\d+)/i)?.[1] ? parseInt(analysis.content.match(/Opportunity Score:?\s*(\d+)/i)![1]) : 70,
                status: 'active'
            });

            // Persistent Notification Engine
            await evaluateAndNotify(userId, analysis.content, clusterName);

            // Legacy Console Notification Protocol
            if (detectStrategicBreach(analysis.content)) {
                notifyStrategicSignal({
                    whatChanged: clusterName,
                    whyItMatters: analysis.content.slice(0, 150) + '...',
                    actionWindow: '72 Hours (Strategic First-Mover Advantage)',
                    riskAssessment: analysis.content.toLowerCase().includes('high') ? 'HIGH (Action Required)' : 'MEDIUM (Monitor Closely)'
                });
            }

            completed++;
            activeRaids.set(userId, { ...activeRaids.get(userId)!, clustersCompleted: completed, status: 'scanning' });
        }

        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'completed', clustersCompleted: RAID_CLUSTERS.length });
        console.log(`[Raid] ${type} raid COMPLETED for ${userId}.`);

        // Remove from active list after 5 minutes to allow UI to catch the completion
        setTimeout(() => activeRaids.delete(userId), 5 * 60 * 1000);

    } catch (error) {
        console.error('[Raid] Raid Failed:', error);
        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'failed' });
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Manual trigger for the Weekly Ride intelligence task.
 */
export async function runManualWeeklyRide(userId: string) {
    console.log('[Raid] Manual Weekly Ride triggered by Operator.');
    // Don't await here, let it run in background as requested
    performInternetRaid('end-of-week', userId);
    return { success: true, message: 'Raid started in background' };
}

async function simulateScraper(topic: string): Promise<string> {
    if (topic.includes('AI') || topic.includes('monetization')) {
        return "Found breakthrough in AI-to-AI marketplace. Autonomous agents now trading compute credits for local Sri Lankan stock data.";
    }
    if (topic.includes('Sri Lankan')) {
        return "Anomaly detected in Colombo Stock Exchange. Undervalued energy sector companies showing 200% whale inflow.";
    }
    return "Found: Viral AI influencer 'NovaX' promoting 'InstantWealth.ai'. Pattern detected: High-frequency posting, bot-like engagement, non-disclosed sponsorship.";
}
