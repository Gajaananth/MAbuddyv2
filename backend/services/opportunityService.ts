import { think } from './openClawService.js';

export interface OpportunitySignal {
    topic: string;
    demand: 'High' | 'Medium' | 'Low';
    competition: 'High' | 'Medium' | 'Low';
    monetization_potential: 'Strong' | 'Moderate' | 'Weak';
    automation_potential: 'Strong' | 'Moderate' | 'Weak';
    overall_score: number; // 0.0 - 10.0
    strategic_insight: string;
    recommended_action: string;
}

/**
 * Opportunity Intelligence Engine (Phase 1)
 * Evaluates earning signals discovered by Karuppu during Internet Rides.
 */
export const opportunityService = {
    /**
     * Parse multiple signals from a raw intelligence report.
     */
    async evaluateSignals(rawAnalysis: string, userId: string = '00000000-0000-0000-0000-000000000000'): Promise<OpportunitySignal[]> {
        try {
            const prompt = `[Karuppu — OPPORTUNITY INTELLIGENCE ENGINE]
Analyze the following strategic findings and identify specific earning opportunities.
For each opportunity, calculate an Opportunity Score based on:
1. Demand (High/Medium/Low)
2. Competition (High/Medium/Low)
3. Monetization Potential (Strong/Moderate/Weak)
4. Automation Potential (Strong/Moderate/Weak)

Findings: "${rawAnalysis.slice(0, 5000)}"

Output JSON format ONLY as an array of objects:
[
  {
    "topic": "Name of opportunity",
    "demand": "High" | "Medium" | "Low",
    "competition": "High" | "Medium" | "Low",
    "monetization_potential": "Strong" | "Moderate" | "Weak",
    "automation_potential": "Strong" | "Moderate" | "Weak",
    "overall_score": 0.0-10.0,
    "strategic_insight": "Brief strategic reasoning",
    "recommended_action": "What the operator should do first"
  }
]`;

            const response = await think(prompt, [], { model: 'llama-3.1-8b-instant', skipSync: true }, userId);
            const signals = JSON.parse(response.content.replace(/```json|```/gi, '').trim());

            return Array.isArray(signals) ? signals : [];
        } catch (e) {
            console.error('[Opportunity] Signal evaluation failed:', e);
            return [];
        }
    },

    /**
     * Handle automation based on the 3-Tier rule:
     * - Score < 6.5: Log only
     * - 6.5 - 7.5: Suggest to Operator
     * - > 7.5: Auto-create Task
     */
    async handleAutomation(signal: OpportunitySignal, userId: string): Promise<string> {
        const score = signal.overall_score;
        const db = (await import('../db/queries.js')).default;
        
        if (score > 7.5) {
            // Tier 3: Auto-create Task
            try {
                const { taskService } = await import('./taskService.js');
                await taskService.createTask(userId, {
                    task_name: `[AUTO] ${signal.topic}`,
                    owner: 'Karuppu',
                    priority: score > 9.0 ? 'HIGH' : 'MEDIUM',
                    duration: 'MEDIUM',
                    action_plan: signal.recommended_action,
                    notes: signal.strategic_insight
                });
                return 'AUTO_CREATED';
            } catch (e) {
                console.error('[Opportunity] Auto-task failure:', e);
                return 'ERROR';
            }
        } else if (score >= 6.5) {
            // Tier 2: Suggest to Operator (Create Notification)
            try {
                // Implementation for notification/suggestion
                await db.saveIntelligenceLog(userId, {
                    category: 'OPPORTUNITY_SUGGESTION',
                    lesson: `High potential signal detected: ${signal.topic}. Suggested Action: ${signal.recommended_action}`,
                    source_context: 'OPPORTUNITY_ENGINE'
                });
                return 'SUGGESTED';
            } catch (e) {
                return 'ERROR';
            }
        }
        
        // Tier 1: Log only (Learning Outcome)
        await db.saveIntelligenceLog(userId, {
            category: 'OPPORTUNITY_LOG',
            lesson: `Signal scouted: ${signal.topic} (Score: ${score}). No immediate action required.`,
            source_context: 'OPPORTUNITY_ENGINE'
        });
        return 'LOGGED';
    },

    /**
     * Calculate a single weighted score for an opportunity.
     */
    calculateScore(signal: Partial<OpportunitySignal>): number {
        let score = 5.0; // Base baseline

        // Metrics mapping
        const weights = {
            High: 2.0, Medium: 1.0, Low: 0.0,
            Strong: 2.0, Moderate: 1.0, Weak: 0.0
        };

        // Demand is highest priority
        const demandVal = (weights as any)[signal.demand || 'Medium'];
        const competitionVal = 2.0 - (weights as any)[signal.competition || 'Medium']; // Inverse
        const monetizationVal = (weights as any)[signal.monetization_potential || 'Moderate'];
        const automationVal = (weights as any)[signal.automation_potential || 'Moderate'];

        score = (demandVal * 0.35 + competitionVal * 0.25 + monetizationVal * 0.2 + automationVal * 0.2) * 5;
        return Math.round(score * 10) / 10;
    }
};
