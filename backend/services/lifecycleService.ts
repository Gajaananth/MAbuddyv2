import db from '../db/queries.js';
import { opportunityService, OpportunitySignal } from './opportunityService.js';
import { taskService } from './taskService.js';
import { eventService, ZiumEvent } from './eventService.js';
import { evaluateDecision } from './decisionEngine.js';

/**
 * Karuppu Lifecycle Service v6.0.0
 * The "Agentic Brain" that enforces the Signal -> Score -> Decision -> Action -> Task -> Tracking -> Learning flow.
 */
export class LifecycleService {
    /**
     * Master processing function for any intelligence signal.
     */
    async processSignal(userId: string, data: {
        category: string;
        source: string;
        content: string; // The raw AI analysis/finding
        tags?: string[];
        metadata?: any;
    }) {
        console.log(`[Lifecycle] 🧠 Processing Signal: ${data.category} | Source: ${data.source}`);

        try {
            // 1. SCORE: Evaluate signals within the content
            const signals = await opportunityService.evaluateSignals(data.content, userId);
            
            if (signals.length === 0) {
                console.log(`[Lifecycle] No actionable signals detected in ${data.category}. Logging as intelligence only.`);
                await this.logLearning(userId, data.category, data.content, data.source);
                return { status: 'LEARNED', signalCount: 0 };
            }

            console.log(`[Lifecycle] Detected ${signals.length} signals. Enforcing lifecycle...`);

            const results = [];

            for (const signal of signals) {
                // 2. DECISION: Determine tier based on score
                const decision = this.determineDecision(signal);
                
                // 3. ACTION & TASK: Execute the decision
                const actionResult = await this.executeDecision(userId, signal, decision, data.metadata);
                
                // 4. TRACKING: Log the agent activity
                await db.logAgentActivity({
                    agent_id: 'NOVA',
                    action_type: 'LIFECYCLE_STEP',
                    platform: data.source,
                    details: `Processed Signal: ${signal.topic} | Decision: ${decision} | Result: ${actionResult}`,
                    metadata: { score: signal.overall_score, signal: signal.topic }
                });

                results.push({ signal: signal.topic, decision, result: actionResult });
            }

            // 5. LEARNING: Persist the final outcome as a strategic lesson
            await this.logLearning(userId, data.category, data.content, data.source, { signals: results });

            // 6. EVENT: Emit completion
            eventService.emitZium(ZiumEvent.OPPORTUNITY_DETECTED, {
                userId,
                category: data.category,
                count: signals.length,
                decisions: results.map(r => r.decision)
            });

            return { status: 'ENFORCED', results };

        } catch (error: any) {
            console.error(`[Lifecycle] CRITICAL FAIL: ${error.message}`);
            throw error;
        }
    }

    private determineDecision(signal: OpportunitySignal): 'AUTO_TASK' | 'SUGGEST' | 'LOG' {
        const decisionResult = evaluateDecision([
            { id: 'auto_task', description: 'AUTO_TASK', strategic_value: signal.overall_score, estimated_reward: 10, estimated_effort: 5, urgency: 5, risk_level: 2, operator_alignment: 8, confidence_score: 9 },
            { id: 'suggest', description: 'SUGGEST', strategic_value: signal.overall_score * 0.8, estimated_reward: 5, estimated_effort: 2, urgency: 2, risk_level: 1, operator_alignment: 7, confidence_score: 8 },
            { id: 'log', description: 'LOG', strategic_value: signal.overall_score * 0.5, estimated_reward: 1, estimated_effort: 1, urgency: 1, risk_level: 1, operator_alignment: 5, confidence_score: 5 }
        ], {});

        const result = decisionResult.recommended_action as 'AUTO_TASK' | 'SUGGEST' | 'LOG';
        if (result === 'AUTO_TASK' || result === 'SUGGEST' || result === 'LOG') {
            if (signal.overall_score >= 7.5 && result !== 'AUTO_TASK') return 'AUTO_TASK';
            return result;
        }

        const score = signal.overall_score;
        if (score >= 7.5) return 'AUTO_TASK';
        if (score >= 6.0) return 'SUGGEST';
        return 'LOG';
    }

    private async executeDecision(userId: string, signal: OpportunitySignal, decision: string, metadata?: any): Promise<string> {
        switch (decision) {
            case 'AUTO_TASK':
                const task = await taskService.createTask(userId, {
                    task_name: `[AUTO] ${signal.topic}`,
                    owner: 'NOVA',
                    priority: signal.overall_score > 9.0 ? 'HIGH' : 'MEDIUM',
                    duration: 'MEDIUM',
                    action_plan: signal.recommended_action,
                    notes: `Strategic Rationale: ${signal.strategic_insight}\nSource Finding: ${metadata?.finding_id || 'Direct Scan'}`
                });

                // ✅ NEW: Alert the operator that an autonomous task has been dispatched
                await db.createNotification(userId, {
                    title: `🤖 Autonomous Task Dispatched: ${signal.topic}`,
                    category: 'AUTONOMY',
                    risk_level: 'Low',
                    monetization_potential: signal.monetization_potential,
                    content: `I've analyzed the signal and dispatched an autonomous task to my execution grid. Plan: ${signal.recommended_action}`,
                    priority: 'high',
                    metadata: { task_id: task.task_id_str, score: signal.overall_score }
                });

                return `TASK_CREATED:${task.task_id_str}`;

            case 'SUGGEST':
                await db.createNotification(userId, {
                    title: `💡 Opportunity Suggestion: ${signal.topic}`,
                    category: 'OPPORTUNITY',
                    risk_level: 'Low',
                    monetization_potential: signal.monetization_potential,
                    content: `I've detected a strong signal for ${signal.topic}. Recommended Action: ${signal.recommended_action}`,
                    priority: 'normal',
                    metadata: { score: signal.overall_score, insight: signal.strategic_insight }
                });
                return 'NOTIFICATION_SENT';


            case 'LOG':
            default:
                // Learning step handled by parent processSignal via logLearning
                return 'LOGGED';
        }
    }

    private async logLearning(userId: string, category: string, content: string, source: string, metadata?: any) {
        // Extract the "Strategic Lesson" if present, else use summary
        const lessonMatch = content.match(/LESSON:\s*(.*)/i);
        const lesson = lessonMatch ? lessonMatch[1] : (content.substring(0, 500) + '...');
        
        await db.saveIntelligenceLog(userId, {
            category,
            lesson: lesson.trim(),
            source_context: source,
            metadata: { ...metadata, timestamp: new Date().toISOString() }
        });
    }
}

export const lifecycleService = new LifecycleService();
