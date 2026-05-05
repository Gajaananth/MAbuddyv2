import cron from 'node-cron';
import { think } from './openClawService.js';
import { getAllUsers } from '../db/authQueries.js';
import { generateWeeklyReport, generateMidWeekReport } from './intelligenceService.js';
import { lifecycleService } from './lifecycleService.js';
import { eventService, ZiumEvent } from './eventService.js';
import db from '../db/queries.js';

// ✅ Fix C2: activeRaids Map replaced with DB-backed status for Vercel serverless compatibility.
// In-memory Maps are lost between serverless function invocations.
// DB status survives across all instances and requests.
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
            const { taskService } = await import('./taskService.js');
            for (const user of users) {
                await performInternetRaid('end-of-week', user.id);
                // 1. End-of-week Intelligence Report for the past week
                await generateWeeklyReport(user.id);
                
                // 2. Initialize new mandatory missions for the upcoming week (Unified via MissionService)
                const { missionService } = await import('./missionService.js');
                await missionService.generateWeeklyTasks(user.id);
            }
        } catch (err) { console.error('[Ride] End-of-week Error:', err); }
    }, { timezone: "Asia/Colombo" });

    console.log('[Ride] Schedule ARMED: Wed & Sun 02:00 AM (Asia/Colombo)');
}

/**
 * Helper to parse AI analysis into structured TrendData
 */
function parseToTrendData(content: string, category: string): any {
    const lines = content.split('\n');
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

/**
 * Core raid function — uses AI to analyze each intelligence cluster.
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string): Promise<void> {
    console.log(`[Ride] [${new Date().toISOString()}] Starting ${type} Internet Ride for user ${userId}...`);

    // ✅ In-process guard (prevents double-start within same serverless instance)
    if (raidInProgress.has(userId)) {
        console.warn(`[Ride] Internet Ride already running for user ${userId}, skipping.`);
        return;
    }
    // DB guard (prevents double-start across serverless instances)
    const existingStatus = await getRaidStatus(userId);
    if (existingStatus && existingStatus.status !== 'completed' && existingStatus.status !== 'failed') {
        const lastStarted = new Date(existingStatus.last_started).getTime();
        if (Date.now() - lastStarted < 20 * 60 * 1000) { // 20 minute grace window
            console.warn(`[Ride] Raid already active in DB for user ${userId}, skipping.`);
            return;
        }
    }
    
    raidInProgress.add(userId);
    await upsertRaidStatus(userId, {
        status: 'starting',
        current_cluster: 'Initializing...',
        clusters_completed: 0,
        total_clusters: RAID_CLUSTERS.length
    });

    let completed = 0;

    try {
        for (const cluster of RAID_CLUSTERS) {
            await upsertRaidStatus(userId, {
                status: 'scanning',
                current_cluster: cluster.name,
                clusters_completed: completed,
                total_clusters: RAID_CLUSTERS.length,
            });

            console.log(`[Ride] [${cluster.name}] Analyzing...`);

            let analysisContent = '';

            try {
                const raidPrompt = `[ZIUM NOVA — INTERNET RIDE SCAN v5.0 — SCOUTING MODE]
Task: Analyze intelligence cluster "${cluster.name}"
Core Mandate: Scout for emerging high-leverage signals. Identify trends before saturation.

Cluster Focus: ${cluster.topic}

Requirement: 
- Provide an intelligence brief (Strategic scouting).
- Flag specific earning signals or manipulation risks.
- Include a MANDATORY "STRATEGIC LESSON" section:
  1. OBSERVATION: [What was seen]
  2. PATTERN: [The underlying logic]
  3. LESSON: [The core takeaway for the team]
  4. APPLICATION: [How we use this right now]
- Ensure 100% alignment with Operator's ethical mission.`;

                await upsertRaidStatus(userId, {
                    status: 'analyzing',
                    current_cluster: cluster.name,
                    clusters_completed: completed,
                    total_clusters: RAID_CLUSTERS.length,
                });
                const analysis = await think(raidPrompt, '', { skipSync: true }, userId);
                analysisContent = analysis.content;


            } catch (err: any) {
                console.error(`[Ride] [${cluster.name}] Analysis failed:`, err.message);
                analysisContent = `Analysis unavailable for ${cluster.name}. Error: ${err.message}`;
            }

            try {
                const riskLevel = extractRiskLevel(analysisContent) || cluster.defaultRisk;

                // 1. Persist to intelligence_raids (The raw finding)
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

                // 2. Pass to Lifecycle Engine for full Agentic Enforcement (Score -> Decision -> Task -> Action -> Learning)
                await lifecycleService.processSignal(userId, {
                    category: cluster.name,
                    source: `Internet Ride: ${type}`,
                    content: analysisContent,
                    metadata: { finding_id: savedFinding?.id, risk: riskLevel }
                });

                // 3. Persist to trend_analyses (For Market Trends page) - Skip for "Cyber-Scam" cluster
                if (cluster.name !== 'Cyber-Scam & Manipulation Filtering') {
                    const trendData = parseToTrendData(analysisContent, cluster.name);
                    // Standardize cluster naming: Derive from cluster name or use CORE
                    const clusterKey = cluster.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'CORE';
                    await db.saveTrendAnalysis(
                        userId,
                        cluster.name,
                        trendData,
                        riskLevel === 'Low' ? 90 : 60,
                        clusterKey
                    );
                }

                await db.logAgentActivity({
                    agent_id: 'NOVA',
                    action_type: 'INTERNET_RIDE',
                    platform: cluster.name,
                    details: `Cluster scan completed: ${cluster.name} | Risk: ${riskLevel}`,
                });

            } catch (persistErr: any) {
                console.error(`[Ride] [${cluster.name}] Lifecycle Enforcement failed:`, persistErr.message);
            }

            completed++;
            await upsertRaidStatus(userId, {
                status: 'scanning',
                current_cluster: cluster.name,
                clusters_completed: completed,
                total_clusters: RAID_CLUSTERS.length,
            });

            await new Promise(res => setTimeout(res, 500));
        }

        raidInProgress.delete(userId);
        await upsertRaidStatus(userId, {
            status: 'completed',
            current_cluster: 'All clusters complete',
            clusters_completed: RAID_CLUSTERS.length,
            total_clusters: RAID_CLUSTERS.length,
        });

        console.log(`[Ride] ${type} Internet Ride complete for ${userId}.`);
        // Status remains in DB — auto-clears after 30min stale check in getRaidStatus()

    } catch (error: any) {
        console.error(`[Ride] Fatal error for ${userId}:`, error.message);
        raidInProgress.delete(userId);
        await upsertRaidStatus(userId, {
            status: 'failed',
            current_cluster: 'Error',
            clusters_completed: 0,
            total_clusters: RAID_CLUSTERS.length,
        });
        // Status remains in DB as 'failed' — auto-clears on next getRaidStatus() call
    }
}



/**
 * Manual trigger — called from the API route.
 * Starts the raid in the background (non-blocking) and returns immediately.
 */
export async function runManualWeeklyRide(userId: string): Promise<{ success: boolean; message: string }> {
    // Start ride asynchronously — do NOT await, so API responds instantly
    performInternetRaid('end-of-week', userId).catch(err => {
        console.error('[Ride] Background Internet Ride error:', err);
    });

    return { success: true, message: 'Strategic raid initiated. Intelligence gathering in progress.' };
}
