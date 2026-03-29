import cron from 'node-cron';
import { think } from './openClawService.js';
import { saveRaidResult, logAgentActivity, findRecentDuplicateRaid } from '../db/queries.js';
import { getAllUsers } from '../db/authQueries.js';
import { generateWeeklyReport, generateMidWeekReport } from './intelligenceService.js';
import { evaluateAndNotify, createOpportunityAlert } from './notificationService.js';

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
 */
export function initRaidingSchedule() {
    console.log('[Ride] Initializing Antigravity Schedule...');

    // Mid-week scan: Wednesday midnight UTC
    cron.schedule('0 0 * * 3', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('mid-week', user.id);
                await generateMidWeekReport(user.id);
            }
        } catch (err) { console.error('[Ride] Mid-week Error:', err); }
    });

    // End-of-week scan + report: Sunday midnight UTC
    cron.schedule('0 0 * * 0', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performInternetRaid('end-of-week', user.id);
                await generateWeeklyReport(user.id);
            }
        } catch (err) { console.error('[Ride] End-of-week Error:', err); }
    });



    console.log('[Ride] Schedule ARMED: Wed & Sun 00:00 UTC (Daily Mode: Disabled)');
}

/**
 * Core raid function — uses AI to analyze each intelligence cluster.
 * No browser needed — the AI model has knowledge and reasoning to synthesize signals.
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string): Promise<void> {
    console.log(`[Ride] [${new Date().toISOString()}] Starting ${type} Internet Ride for user ${userId}...`);

    // Guard: prevent double raids for same user
    if (activeRaids.has(userId)) {
        const current = activeRaids.get(userId)!;
        if (current.status !== 'completed' && current.status !== 'failed') {
            console.warn(`[Ride] [${new Date().toISOString()}] Internet Ride already running for user ${userId}, skipping.`);
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

    console.log(`[Ride] Initialized raid state for ${userId}. Total clusters: ${RAID_CLUSTERS.length}`);
    let completed = 0;

    try {
        for (const cluster of RAID_CLUSTERS) {
            // Update progress: scanning this cluster
            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                status: 'scanning',
                currentCluster: cluster.name,
                clustersCompleted: completed,
            });

            console.log(`[Ride] [${cluster.name}] Progress: ${completed}/${RAID_CLUSTERS.length}. Analyzing...`);

            let analysisContent = '';

            try {
                // Use AI to generate real intelligence for this cluster
                const raidPrompt = `[ZIUM NOVA — INTERNET RIDE AUTOMATION v3.1.0]
Identity: Silent Beast Intelligence (Smart Buddy)
Mode: FULL AUTONOMOUS AGENTIC AI

[MISSION FOR THIS CLUSTER]
Topic: ${cluster.topic}

[OPERATIONAL MANDATES]
1. INDEPENDENT SCOUTING: Scan for trends and earning signals autonomously.
2. STRATEGIC FILTRATION: Discard greed-based hype; keep only trust-based value.
3. PRE-ACTIVATION: Prepare activation steps for any verified opportunity.

[OUTPUT PROTOCOL]
- If an opportunity is found, describe it naturally like a smart buddy.
- BANNED: Headers like "Category:", "Why it is legitimate:", or bulleted robotic lists.
- STYLE: Calm, intelligent, and focused on strategic leverage.
- If no critical signal is found, provide a concise internal strategic brief.`;

                activeRaids.set(userId, {
                    ...activeRaids.get(userId)!,
                    status: 'analyzing',
                });

                const analysis = await think(raidPrompt, '', { skipSync: true }, userId);
                analysisContent = analysis.content;
                console.log(`[Ride] [${cluster.name}] AI Analysis complete. Content length: ${analysisContent.length}`);

            } catch (err: any) {
                console.error(`[Ride] [${cluster.name}] CRITICAL: Cluster analysis failed:`, err.message);
                analysisContent = `Analysis unavailable for ${cluster.name}. Manual review recommended. Error: ${err.message}`;
            }

            try {
                // Extract dynamic risk from AI output
                const riskLevel = extractRiskLevel(analysisContent) || cluster.defaultRisk;

                // Duplicate raid prevention — skip if same cluster was saved in last 12 hours
                const isDuplicateRaid = await findRecentDuplicateRaid(userId, cluster.name, 12);
                if (isDuplicateRaid) {
                    console.log(`[Ride] [${cluster.name}] DUPLICATE DETECTED (12h window). Skipping persistence.`);
                    completed++;
                    continue;
                }

                // Persist to DB
                console.log(`[Ride] [${cluster.name}] Persisting finding to database...`);
                const savedFinding = await saveRaidResult(userId, {
                    category: cluster.name,
                    risk_level: riskLevel,
                    source_platform: 'Zium Nova AI Analysis',
                    content: `[${cluster.name}] ${cluster.topic.slice(0, 200)}`,
                    summary: analysisContent,
                    tags: [...cluster.tags, type],
                    ride_type: type === 'mid-week' ? 'mid-week' : 'end-week',
                    opportunity_score: riskLevel === 'High' ? 85 : riskLevel === 'Medium' ? 65 : 45,
                    status: 'active',
                });

                // Detect high-quality opportunity based on confidence score (Ultra Mode)
                const extractScore = (key: string) => {
                    const match = analysisContent.match(new RegExp(`${key}:\\s*(\\d+)`, 'i'));
                    return match ? parseInt(match[1], 10) : 0;
                };

                const tech = extractScore('Technology_Value');
                const market = extractScore('Market_Demand');
                const monetization = extractScore('Monetization_Strength');
                const hype = extractScore('Hype_Noise');
                const scam = extractScore('Scam_Probability');

                // Opportunity Score = (Tech + Market + Monetization) - (Hype + Scam)
                const confidenceScore = (tech + market + monetization) - (hype + scam);
                const isEarningSignal = analysisContent.includes('EARNING SIGNAL DETECTED') || analysisContent.includes('OPPORTUNITY DETECTED');

                if (confidenceScore >= 80 || isEarningSignal) {
                    console.log(`[Ride] [${cluster.name}] SILENT BEAST Earning Signal Detected! Confidence: ${confidenceScore}%`);
                    await createOpportunityAlert(userId, {
                        platform: cluster.name,
                        source: 'Zium Nova Autonomous Internet Ride',
                        opportunityType: cluster.name,
                        credibility: analysisContent.match(/LEGITIMACY:\s*(.*)/i)?.[1] || analysisContent.match(/CREDIBILITY:\s*(.*)/i)?.[1] || 'Verified Protocol Compliance',
                        earningPotential: analysisContent.match(/POTENTIAL:\s*(.*)/i)?.[1] || analysisContent.match(/EARNING_POTENTIAL:\s*(.*)/i)?.[1] || 'Strategic Leverage',
                        confidenceLevel: confidenceScore || 85,
                        recommendedActions: analysisContent.match(/SETUP ACTIONS:\s*(.*)/i)?.[1] || analysisContent.match(/ACTION:\s*(.*)/i)?.[1] || 'Begin operational setup as prepared.',
                        findingId: savedFinding?.id
                    });
                }

                // Regular notification evaluation
                await evaluateAndNotify(userId, analysisContent, cluster.name, { finding_id: savedFinding?.id });

                await logAgentActivity({
                    action_type: 'INTERNET_RIDE',
                    platform: cluster.name,
                    details: `Cluster scan completed: ${cluster.name} | Risk: ${riskLevel}`,
                });
            } catch (persistErr: any) {
                console.error(`[Ride] [${cluster.name}] Database persistence failed:`, persistErr.message);
            }

            completed++;
            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                status: 'scanning',
                clustersCompleted: completed,
            });

            // Small delay between clusters to avoid rate limits
            await new Promise(res => setTimeout(res, 500));
        }

        // Mark completed
        activeRaids.set(userId, {
            ...activeRaids.get(userId)!,
            status: 'completed',
            clustersCompleted: RAID_CLUSTERS.length,
        });

        console.log(`[Ride] [${new Date().toISOString()}] ${type} Internet Ride complete for user ${userId}. ${completed} clusters analyzed.`);

        // Auto-clear from map after 60s so future raids can start
        setTimeout(() => activeRaids.delete(userId), 60_000);

    } catch (error: any) {
        console.error(`[Ride] [${new Date().toISOString()}] Fatal Internet Ride error for user ${userId}:`, error.message);
        activeRaids.set(userId, {
            ...activeRaids.get(userId)!,
            status: 'failed',
        });
        // Clear failed raids after 15s
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
