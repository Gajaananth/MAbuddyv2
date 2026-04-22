import cron from 'node-cron';
import { think } from './openClawService.js';
import { getAllUsers } from '../db/authQueries.js';
import { generateWeeklyReport, generateMidWeekReport } from './intelligenceService.js';
import { lifecycleService } from './lifecycleService.js';
import { eventService, ZiumEvent } from './eventService.js';
import db from '../db/queries.js';

// Track active raids per user for UI progress feedback
export const activeRaids = new Map<string, {
    status: 'starting' | 'scanning' | 'analyzing' | 'completed' | 'failed';
    currentCluster: string;
    clustersCompleted: number;
    totalClusters: number;
    lastStarted: string;
}>();

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

    if (activeRaids.has(userId)) {
        const current = activeRaids.get(userId)!;
        if (current.status !== 'completed' && current.status !== 'failed') {
            console.warn(`[Ride] Internet Ride already running for user ${userId}, skipping.`);
            return;
        }
    }

    activeRaids.set(userId, {
        status: 'starting',
        currentCluster: 'Initializing...',
        clustersCompleted: 0,
        totalClusters: RAID_CLUSTERS.length,
        lastStarted: new Date().toISOString(),
    });

    let completed = 0;

    try {
        for (const cluster of RAID_CLUSTERS) {
            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                status: 'scanning',
                currentCluster: cluster.name,
                clustersCompleted: completed,
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

                activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'analyzing' });
                const analysis = await think(raidPrompt, '', { skipSync: true }, userId);
                analysisContent = analysis.content;

                // --- Opportunity Intelligence Engine (V3 Integration) ---
                const { opportunityService } = await import('./opportunityService.js');
                const signals = await opportunityService.evaluateSignals(analysisContent, userId);
                
                if (signals.length > 0) {
                    console.log(`[Ride] [${cluster.name}] Opportunity Pulse: Detected ${signals.length} potential signals.`);
                    
                    for (const s of signals) {
                        const automationResult = await opportunityService.handleAutomation(s, userId);
                        console.log(`[Ride] Automation for ${s.topic}: ${automationResult}`);
                    }

                    // Attach signals to cluster analysis for storage
                    analysisContent += '\n\n### 🚀 Opportunity Intelligence signals\n';
                    signals.forEach(s => {
                        analysisContent += `- **${s.topic}** (Score: ${s.overall_score}/10) | Demand: ${s.demand} | Competition: ${s.competition}\n  - *Insight*: ${s.strategic_insight}\n  - *Action*: ${s.recommended_action}\n`;
                    });
                }
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
            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                status: 'scanning',
                clustersCompleted: completed,
            });

            await new Promise(res => setTimeout(res, 500));
        }

        activeRaids.set(userId, {
            ...activeRaids.get(userId)!,
            status: 'completed',
            clustersCompleted: RAID_CLUSTERS.length,
        });

        console.log(`[Ride] ${type} Internet Ride complete for ${userId}.`);
        setTimeout(() => activeRaids.delete(userId), 60_000);

    } catch (error: any) {
        console.error(`[Ride] Fatal error for ${userId}:`, error.message);
        activeRaids.set(userId, { ...activeRaids.get(userId)!, status: 'failed' });
        setTimeout(() => activeRaids.delete(userId), 15_000);
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
