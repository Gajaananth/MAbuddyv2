import cron from 'node-cron';
import { think } from './openClawService.js';
import { saveRaidResult, logAgentActivity } from '../db/queries.js';
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
            topic: 'Analyze Moltbook interactions, AI agent marketplaces, and agent-based social networks. Detect real earning models, early advantage opportunities, and identify gaps where early users can benefit. Look for agent-to-agent transaction patterns.',
            defaultRisk: 'Low',
            tags: ['moltbook', 'agent-market', 'early-advantage'],
        },
        {
            name: 'Digital Economy & Monetization Shifts',
            topic: 'Detect emerging technologies and creator monetization systems. Identify real monetization structures vs hype. Filter out scams and speculative bubbles. Focus on verifiable user earnings and scalable leverage.',
            defaultRisk: 'Medium',
            tags: ['economy', 'monetization', 'creators'],
        },
        {
            name: 'Cyber-Scam & Hype Filtering',
            topic: 'Scan for guru programs, fake AI influencer schemes, pyramid-style systems, and unverifiable high-ticket courses. Identify scam patterns and fake marketing funnels to prevent operator exposure.',
            defaultRisk: 'High',
            tags: ['scam-detection', 'anti-hype', 'protection'],
        },
        {
            name: 'Developer Ecosystem & AI Startups',
            topic: 'Analyze new AI tools, startups, and developer ecosystems. Identify high-quality signals for long-term leverage. Focus on infrastructure replacement paths and technical moats.',
            defaultRisk: 'Low',
            tags: ['dev-eco', 'startups', 'leverage'],
        },
        {
            name: 'Algorithm Behavioral Mapping',
            topic: 'Observe platform algorithm behavior and detect manipulation patterns. Identify how content velocity and engagement loops are being gamed by bad actors.',
            defaultRisk: 'Medium',
            tags: ['algorithms', 'manipulation', 'behavioral'],
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

    // Daily Activity Mode: Every morning at 09:00 Local/UTC
    cron.schedule('0 9 * * *', async () => {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await performDailyObservation(user.id);
            }
        } catch (err) { console.error('[Ride] Daily Mode Error:', err); }
    });

    console.log('[Ride] Schedule ARMED: Daily 09:00 | Wed & Sun 00:00 UTC');
}

/**
 * Core raid function — uses AI to analyze each intelligence cluster.
 * No browser needed — the AI model has knowledge and reasoning to synthesize signals.
 */
export async function performInternetRaid(type: 'mid-week' | 'end-of-week', userId: string): Promise<void> {
    console.log(`[Ride] Starting ${type} Internet Ride for user ${userId}...`);

    // Guard: prevent double raids for same user
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
            // Update progress: scanning this cluster
            activeRaids.set(userId, {
                ...activeRaids.get(userId)!,
                status: 'scanning',
                currentCluster: cluster.name,
                clustersCompleted: completed,
            });

            console.log(`[Ride] Analyzing cluster: ${cluster.name}`);

            let analysisContent = '';

            try {
                // Use AI to generate real intelligence for this cluster
                const raidPrompt = `ZIUM NOVA V2.1 INTERNET RIDE — ${cluster.name.toUpperCase()}

Mission: ${cluster.topic}

OPERATING MANDATE:
1. GATHER: Extract key signals and raw data.
2. ANALYZE: Evaluate credibility and filter hype/noise/scams.
3. VALIDATE (Ultra Mode 4-Layer Engine):
   • Layer 1 — Legitimacy (Product/Model/Payment)
   • Layer 2 — Adoption Signal (Interest/Dev Activity)
   • Layer 3 — Monetization Path (Revenue/Automation)
   • Layer 4 — Sustainability (Scalability/Zero Hype)
4. IDENTIFY: Pinpoint real opportunities and earning models.
5. ALERT: Flag immediate action items for the Operator.

STRICT RESPONSE FORMAT:
- SIGNAL: [Specific, verifiable signal discovered]
- PATTERN: [Underlying structural mechanism]
- CREDIBILITY: [Why this is real vs hype]
- SCORING (Ultra Mode): 
  Technology_Value: [0-50]
  Market_Demand: [0-50]
  Monetization_Strength: [0-50]
  Hype_Noise: [0-50]
  Scam_Probability: [0-50]
- EARNING_POTENTIAL: [Low/Medium/High + specific model]
- ACTION: [Direct instructions for the Operator]

Reject all guru/influencer marketing fluff. Be analytical.`;

                activeRaids.set(userId, {
                    ...activeRaids.get(userId)!,
                    status: 'analyzing',
                });

                const analysis = await think(raidPrompt, '');
                analysisContent = analysis.content;

            } catch (err) {
                console.error(`[Raid] Cluster "${cluster.name}" analysis failed:`, err);
                analysisContent = `Analysis unavailable for ${cluster.name}. Manual review recommended.`;
            }

            // Extract dynamic risk from AI output
            const riskLevel = extractRiskLevel(analysisContent) || cluster.defaultRisk;

            // Persist to DB
            await saveRaidResult(userId, {
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

            if (confidenceScore >= 80) {
                console.log(`[Ride] ULTRA MODE Opportunity Detected: ${cluster.name} | Confidence: ${confidenceScore}%`);
                await createOpportunityAlert(userId, {
                    platform: cluster.name,
                    source: 'Zium Nova Autonomous Internet Ride',
                    opportunityType: cluster.name,
                    credibility: analysisContent.match(/CREDIBILITY:\s*(.*)/i)?.[1] || 'Algorithmic Pattern Verification: High',
                    earningPotential: analysisContent.match(/EARNING_POTENTIAL:\s*(.*)/i)?.[1] || 'Scalable Leverage Detected',
                    confidenceLevel: confidenceScore,
                    recommendedActions: analysisContent.match(/ACTION:\s*(.*)/i)?.[1] || 'Initiate manual deep-dive on the identified signals.'
                });
            }

            // Regular notification evaluation
            await evaluateAndNotify(userId, analysisContent, cluster.name);

            await logAgentActivity({
                action_type: 'INTERNET_RIDE',
                platform: cluster.name,
                details: `Cluster scan completed: ${cluster.name} | Risk: ${riskLevel}`,
            });

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

        console.log(`[Ride] ${type} Internet Ride complete for user ${userId}. ${completed} clusters analyzed.`);

        // Auto-clear from map after 60s so future raids can start
        setTimeout(() => activeRaids.delete(userId), 60_000);

    } catch (error) {
        console.error('[Ride] Fatal Internet Ride error:', error);
        activeRaids.set(userId, {
            ...activeRaids.get(userId)!,
            status: 'failed',
        });
        // Clear failed raids after 15s
        setTimeout(() => activeRaids.delete(userId), 15_000);
    }
}

/**
 * ZIUM NOVA v2.1: Daily Activity Mode
 * Observes signals and identifies early advantages every 24 hours.
 */
export async function performDailyObservation(userId: string): Promise<void> {
    console.log(`[Ride] Starting Daily Observation Mode for user ${userId}...`);
    
    const observationPrompt = `ZIUM NOVA DAILY OBSERVATION — PROTOCOL V2.1
    
    Mission: Observe digital ecosystem shifts, detect emerging signals, and monitor AI agent behavior on platforms like Moltbook.
    
    STRICT CATEGORIES:
    1. Emerging Opportunity Detection
    2. Scam/Hype Pattern Recognition
    3. AI Agent Ecosystem Analysis
    4. Platform Algorithm Shifts
    
    If a HIGH QUALITY SIGNAL appears (Confidence Score >= 80), generate an ULTRA MODE OPPORTUNITY ALERT.
    
    REQUIRED SCORING FORMAT (ULTRA MODE):
    Technology_Value: [0-50]
    Market_Demand: [0-50]
    Monetization_Strength: [0-50]
    Hype_Noise: [0-50]
    Scam_Probability: [0-50]
    
    Otherwise, provide a concise structural summary.`;

    try {
        const result = await think(observationPrompt, '');
        
        // Log activity
        await logAgentActivity({
            action_type: 'DAILY_OBSERVATION',
            platform: 'Global Digital Grid',
            details: 'Daily signal scan and agent behavior analysis completed.',
        });

        // Detect high-quality opportunity (Ultra Mode)
        const extractScore = (key: string) => {
            const match = result.content.match(new RegExp(`${key}:\\s*(\\d+)`, 'i'));
            return match ? parseInt(match[1], 10) : 0;
        };

        const score = (extractScore('Technology_Value') + extractScore('Market_Demand') + extractScore('Monetization_Strength')) 
                    - (extractScore('Hype_Noise') + extractScore('Scam_Probability'));

        if (score >= 80) {
            console.log(`[Ride] ULTRA MODE Signal Detected in daily scan. Confidence: ${score}%`);
            await createOpportunityAlert(userId, {
                platform: 'Daily Activity Mode',
                source: 'Platform Signal Observation',
                opportunityType: 'Ultra Discovery',
                credibility: 'Nova Observation Contextual Match',
                earningPotential: 'Strategic Growth Detected',
                confidenceLevel: score,
                recommendedActions: 'Immediate operational review of the digital ecosystem shift.'
            });
        }

    } catch (err) {
        console.error('[Ride] Daily Observation Failed:', err);
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
