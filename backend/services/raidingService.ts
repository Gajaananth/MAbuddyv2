import cron from 'node-cron';
import { think } from './openClawService.js';
import { getAllUsers } from '../db/authQueries.js';
import { generateWeeklyReport, generateMidWeekReport } from './intelligenceService.js';
import { lifecycleService } from './lifecycleService.js';
import { eventService, ZiumEvent } from './eventService.js';
import db from '../db/queries.js';

// ✅ Fix C2: activeRaids Map replaced with DB-backed status for Vercel serverless compatibility.
import { upsertRaidStatus, getRaidStatus } from '../db/queries.js';

// Keep a lightweight in-memory guard ONLY to prevent double-starts within the same process instance
const raidInProgress = new Set<string>();

// Each cluster defines what to analyze and what risk category it maps to
const RAID_CLUSTERS: Array<{
    name: string;
    topic: string;
    defaultRisk: 'Low' | 'Medium' | 'High';
    tags: string[];
}> = [
        {
            name: 'Moltbook & Agent Marketplace Intelligence',
            topic: 'Analyze Moltbook interactions, AI agent marketplaces, and agent-based social networks. Detect real earning models, early advantage opportunities, and identify gaps where early users can benefit.',
            defaultRisk: 'Low',
            tags: ['moltbook', 'agent-market', 'early-advantage'],
        },
        {
            name: 'Global Digital Economy & Monetization Signals',
            topic: 'Detect emerging technologies, creator monetization shifts, and global digital economy trends. Identify verifiable revenue structures vs speculative hype. Focus on scalable leverage and autonomous earning systems.',
            defaultRisk: 'Medium',
            tags: ['global-economy', 'monetization', 'trends'],
        },
        {
            name: 'Sri Lankan Strategic Leverage & Market Signals',
            topic: 'Analyze Sri Lankan stock market movements, regional macro-economic signals, and local digital economy growth. Identify unique arbitrage or high-value entry points within the region.',
            defaultRisk: 'Medium',
            tags: ['sri-lanka', 'stock-market', 'regional-leverage'],
        },
        {
            name: 'Marketing Innovation & Growth Architectures',
            topic: 'Scan for futuristic marketing models, AI-driven marketing systems, and platform growth algorithms. Identify shifts away from conventional influencer models toward AI-driven infrastructure.',
            defaultRisk: 'Low',
            tags: ['marketing', 'innovation', 'algorithms'],
        },
        {
            name: 'Cyber-Scam & Manipulation Filtering',
            topic: 'Scan for guru programs, fake AI influencer schemes, pyramid-style systems, and manipulative algorithm behaviors. Flag scams and protect operator exposure with 100% accuracy.',
            defaultRisk: 'High',
            tags: ['scam-detection', 'protection', 'fairness'],
        },
    ];

/**
 * Risk level extractor from AI analysis content
 */
function extractRiskLevel(content: string): 'Low' | 'Medium' | 'High' {
    const lower = content.toLowerCase();
    const highSignals = ['critical', 'high risk', 'dangerous', 'scam', 'pyramid', 'fraud', 'manipulation', 'urgent'];
    const lowSignals = ['low risk', 'safe', 'stable', 'emerging opportunity', 'long-term', 'foundational'];

    const highScore = highSignals.filter(s => lower.includes(s)).length;
    const lowScore = lowSignals.filter(s => lower.includes(s)).length;

    if (highScore >= 2) return 'High';
    if (lowScore >= 2) return 'Low';
    return 'Medium';
}

/**
 * Initialize Cron Schedule
 * Configured for Sri Lanka Time (GMT +5:30)
 */
export function initRaidingSchedule() {
    console.log('[Ride] Initializing Strategic Pipeline (SL Time GMT+5:30)...');

    // Mid-week Briefing: Wednesday 02:00 AM SL Time
    cron.schedule('0 2 * * 3', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('mid-week', user.id);
                await generateMidWeekReport(user.id);
            }
        } catch (err) { console.error('[Ride] Mid-week Error:', err); }
    }, { timezone: "Asia/Colombo" });

    // End-of-week Intelligence Report: Sunday 02:00 AM SL Time
    cron.schedule('0 2 * * 0', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('end-of-week', user.id);
                await generateWeeklyReport(user.id);
            }
        } catch (err) { console.error('[Ride] End-of-week Error:', err); }
    }, { timezone: "Asia/Colombo" });
}

/**
 * Core raid function — uses AI to analyze each intelligence cluster.
 * Refactored for Segmented Execution (Serverless friendly).
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string): Promise<void> {
    console.log(`[Ride] [${new Date().toISOString()}] Processing ${type} segment for user ${userId}...`);

    if (raidInProgress.has(userId)) {
        console.warn(`[Ride] Internet Ride already running in-process for user ${userId}, skipping.`);
        return;
    }

    const existingStatus = await getRaidStatus(userId);
    let completed = 0;

    if (existingStatus && (existingStatus.status === 'scanning' || existingStatus.status === 'analyzing')) {
        const lastStarted = new Date(existingStatus.last_started).getTime();
        // If it's been > 4 hours, assume it failed and restart
        if (Date.now() - lastStarted > 240 * 60 * 1000) {
            console.log(`[Ride] Stale raid detected for user ${userId}, restarting.`);
            completed = 0;
        } else {
            completed = existingStatus.clusters_completed;
            console.log(`[Ride] Resuming raid for user ${userId} from cluster ${completed + 1}...`);
        }
    }

    if (completed >= RAID_CLUSTERS.length && existingStatus?.status === 'completed') {
        console.log(`[Ride] Raid already completed for user ${userId}.`);
        return;
    }

    if (completed === 0) {
        await upsertRaidStatus(userId, {
            status: 'starting',
            current_cluster: 'Initializing...',
            clusters_completed: 0,
            total_clusters: RAID_CLUSTERS.length
        });
    }

    raidInProgress.add(userId);

    try {
        for (let i = completed; i < RAID_CLUSTERS.length; i++) {
            const cluster = RAID_CLUSTERS[i];
            
            await upsertRaidStatus(userId, {
                status: 'analyzing',
                current_cluster: cluster.name,
                clusters_completed: i,
                total_clusters: RAID_CLUSTERS.length,
            });

            console.log(`[Ride] [${cluster.name}] Analyzing...`);

            const raidPrompt = `[ZIUM NOVA — INTERNET RIDE SCAN v6.0 — ANTIGRAVITY MODE]
Cluster: "${cluster.name}"
Mission: ${cluster.topic}

You are scouting the internet RIGHT NOW for this cluster. Think like an intelligence analyst
who also has a mandate to find real income. Your output will be saved as a report and
linked to a notification — so it MUST be specific, real, and actionable.

MANDATORY OUTPUT STRUCTURE (use ALL sections):

OBSERVATION:
What is actually happening in this cluster right now? Be specific. No vague trends.

EARNING SIGNAL:
Is there a direct, ethical way to earn money from this cluster? 
If yes — name the SPECIFIC platform, the SPECIFIC task type, the ESTIMATED reward range,
and the EXACT first step to take. If no earning signal, state clearly: "No direct earning opportunity this cycle."

RISK LEVEL: [Low / Medium / High]
Reason: [1 sentence explaining the risk classification]

STRATEGIC LESSON:
1. OBSERVATION: [What was seen]
2. PATTERN: [The underlying logic]
3. LESSON: [Core takeaway]
4. APPLICATION: [How we use this right now — specific action, not theory]

NEXT ACTION:
One concrete next step. Who does it (NOVA or OPERATOR)? What exactly? By when?

RULES:
- Be specific. No filler. No generic "AI is growing" type statements.
- If you found a real earning opportunity, include the platform name and URL pattern.
- This output will be shown directly to the Operator as a report — make it worth reading.
`;

            let analysisContent = '';
            try {
                const analysis = await think(raidPrompt, '', { skipSync: true }, userId);
                analysisContent = analysis.content;
            } catch (err: any) {
                console.error(`[Ride] [${cluster.name}] Analysis failed:`, err.message);
                analysisContent = `Analysis unavailable for ${cluster.name}. Error: ${err.message}`;
            }

            const riskLevel = extractRiskLevel(analysisContent) || cluster.defaultRisk;

            // 1. Persist to intelligence_raids
            const savedFinding = await db.saveRaidResult(userId, {
                category: cluster.name,
                risk_level: riskLevel,
                source_platform: 'Zium Nova AI Analysis',
                content: `[${cluster.name}] ${cluster.topic.slice(0, 200)}`,
                summary: analysisContent,
                tags: [...cluster.tags, type],
                ride_type: type === 'mid-week' ? 'mid-week' : 'end-week',
                opportunity_score: riskLevel === 'High' ? 40 : riskLevel === 'Medium' ? 70 : 90,
                status: 'active',
            });

            // 2. Pass to Lifecycle Engine
            await lifecycleService.processSignal(userId, {
                category: cluster.name,
                source: `Internet Ride: ${type}`,
                content: analysisContent,
                metadata: { finding_id: savedFinding?.id, risk: riskLevel }
            });

            // 3. Trend Analysis
            if (cluster.name !== 'Cyber-Scam & Manipulation Filtering') {
                const trendData = parseToTrendData(analysisContent, cluster.name);
                const clusterKey = cluster.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'CORE';
                await db.saveTrendAnalysis(userId, cluster.name, trendData, riskLevel === 'Low' ? 90 : 60, clusterKey);
            }

            // 4. Notification for Significant Findings
            if (riskLevel === 'High' || analysisContent.toLowerCase().includes('earning signal')) {
                const { storeStrategicNotification } = await import('./notificationService.js');
                await storeStrategicNotification(userId, `🚨 High-Value Signal: ${cluster.name}`, analysisContent, {
                    raid_id: savedFinding?.id,
                    risk: riskLevel,
                    category: 'STRATEGIC_RIDE'
                });
            }

            completed = i + 1;
            await upsertRaidStatus(userId, {
                status: 'analyzing',
                current_cluster: cluster.name,
                clusters_completed: completed,
                total_clusters: RAID_CLUSTERS.length,
            });

            // ✅ Vercel Optimization: Exit after processing 1-2 clusters to avoid timeout
            // Heartbeat loop will pick it back up in the next cycle.
            if (process.env.VERCEL && (completed % 2 === 0 || completed === RAID_CLUSTERS.length)) {
                console.log(`[Ride] Vercel segment finished (${completed}/${RAID_CLUSTERS.length}).`);
                return;
            }
        }

        // Finalize
        await upsertRaidStatus(userId, {
            status: 'completed',
            current_cluster: 'Finished',
            clusters_completed: RAID_CLUSTERS.length,
            total_clusters: RAID_CLUSTERS.length,
        });
        console.log(`[Ride] Internet Ride for user ${userId} COMPLETED.`);

    } catch (error: any) {
        console.error(`[Ride] Fatal Raid Failure for user ${userId}:`, error.message);
        await upsertRaidStatus(userId, {
            status: 'failed',
            current_cluster: 'Fatal Error',
            clusters_completed: completed,
            total_clusters: RAID_CLUSTERS.length
        });
    } finally {
        raidInProgress.delete(userId);
    }
}

/**
 * AI Content Parser for Market Trends
 */
function parseToTrendData(content: string, cluster: string): any {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const summary = content.slice(0, 500) + (content.length > 500 ? '...' : '');

    return {
        summary: summary,
        fairness_score: content.toLowerCase().includes('scam') ? 20 : 85,
        scam_indicators: lines.filter(l => l.toLowerCase().includes('risk') || l.toLowerCase().includes('scam')).slice(0, 3),
        ethical_opportunities: lines.filter(l => l.toLowerCase().includes('opportunity') || l.toLowerCase().includes('benefit')).slice(0, 3),
        recommendations: lines.filter(l => l.toLowerCase().includes('action') || l.toLowerCase().includes('setup')).slice(0, 3),
        unfair_patterns: lines.filter(l => l.toLowerCase().includes('hype') || l.toLowerCase().includes('fake')).slice(0, 3)
    };
}

export async function runManualWeeklyRide(userId: string): Promise<void> {
    await performInternetRaid('end-of-week', userId);
    await generateWeeklyReport(userId);
}
