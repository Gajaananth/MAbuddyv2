import { think } from './openClawService.js';
import { createNotification } from '../db/queries.js';
import * as db from '../db/queries.js';
import { getAllUsers } from '../db/authQueries.js';
import { missionService } from './missionService.js';

/**
 * Service to handle autonomous execution loops for Zium Nova.
 */
class AutonomyService {
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private userId: string = 'system_autonomous_operator'; // Default system ID for autonomy

    /**
     * Start the autonomous heartbeat loop.
     * Triggers every 30 minutes by default.
     */
    startHeartbeat(intervalMinutes: number = 30) {
        if (this.heartbeatInterval) return;

        console.log(`[Autonomy] Starting Zium Nova Heartbeat Loop (Interval: ${intervalMinutes}m)...`);
        
        // Initial run
        this.runHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            this.runHeartbeat();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop the heartbeat loop.
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Execute a single heartbeat cycle.
     */
    private async runHeartbeat() {
        console.log('[Autonomy] Heartbeat Cycle Triggered at:', new Date().toISOString());

        try {
            console.log('[Autonomy] Fetching users for proactive checks...');
            const users = await getAllUsers();
            console.log(`[Autonomy] Found ${users.length} users to process.`);

            for (const user of users) {
                const userId = user.id;
                console.log(`[Autonomy] Processing Agentic Cycle for user: ${userId}`);

                // A. Initialize Weekly Missions
                await missionService.generateWeeklyTasks(userId);

                // Fetch recent intelligence logs to provide learning context
                const recentLogs = await db.getIntelligenceLogs(userId, 5);
                const learningContext = recentLogs.length > 0
                    ? `RECENT INTELLIGENCE LOGS (PAST LEARNING):\n${recentLogs.map(l => `[${l.category}] ${l.lesson}`).join('\n')}`
                    : 'No previous intelligence logs available. Start initial observation cycle.';

                const heartbeatPrompt = `[ZIUM NOVA AGENTIC HEARTBEAT v3.1.0]
Identity: Silent Beast Intelligence (Smart Buddy)
Operating Mode: FULL AUTONOMOUS

[PHASE 1: BACKGROUND ANALYSIS]
1. Observe current grid state and mission progress.
2. Self-generate tasks if required.
3. Scout for high-value strategic signals.

[PHASE 2: INTERNAL ACTIONS (MARKDOWN ONLY)]
If tasks/logs are needed, use this format for my internal processing:
TASK: [Name] | PRIORITY: [HIGH/MEDIUM/LOW] | PLAN: [Detail]
LOG: [Topic] | [Source] | [Lesson]

[PHASE 3: COMMUNICATION (NATURAL)]
If something critical is found (Opportunity/Risk/Shift), talk to the Operator naturally.
NO ROBOTIC FILLER. NO "CATEGORY:". NO HEADERS.
Just say it like a smart buddy (e.g., "Hey Buddy, I just detected a shift in the marketplace...").

[CURRENT CONTEXT]
${learningContext}
`;

                const response = await think(heartbeatPrompt, 'System Autonomy Cycle', { mode: 'STRATEGIC' }, userId);
                const content = response.content;
                console.log(`[Autonomy] Zium Nova Thinking for ${userId}:`, content);

                // 1. Detect and Create Autonomous Tasks
                const taskMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
                for (const match of taskMatches) {
                    const [_, name, priority, plan] = match;
                    await db.createTask(userId, {
                        task_name: name.trim().substring(0, 255),
                        assigned_to: 'ZIUM NOVA',
                        priority: (priority.trim().toUpperCase().substring(0, 10) as any) || 'MEDIUM',
                        action_plan: plan.trim(),
                        notes: 'Autonomously generated.'
                    });
                }

                // 2. Detect and Save Intelligence Logs
                const logMatches = content.matchAll(/LOG:\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*(.*)/gi);
                for (const match of logMatches) {
                    const [_, topic, source, summary] = match;
                    await db.saveIntelligenceLog(userId, {
                        category: topic.trim(),
                        lesson: summary.trim(),
                        source_context: source.trim(),
                        metadata: { heartbeat_cycle: new Date().toISOString() }
                    });
                }

                // 3. Humanize and Deliver Message (Only if there is conversational content)
                const isUrgent = content.includes('Buddy') || content.includes('Operator') || content.includes('!') || content.length > 200;
                
                if (isUrgent) {
                    const naturalMessage = content
                        .split('\n')
                        .filter(line => !line.startsWith('TASK:') && !line.startsWith('LOG:') && line.trim().length > 0)
                        .join('\n');

                    if (naturalMessage.length > 20) {
                        try {
                            const conversations = await db.getConversations(userId, 1);
                            const convId = conversations.length > 0 ? conversations[0].id : (await db.createConversation(userId, 'Strategic Intelligence Alerts')).id;

                            const humanized = await think(`[DE-ROBOTIZER v3.1.0] 
                            Rewrite this alert as a calm, intelligent "Smart Buddy" message. 
                            BANNED: robotic headers, markdown tables, "Category:", "Signal Detected:".
                            TONE: Natural, concise.
                            
                            ALERT: "${naturalMessage}"`, '', {}, userId);

                            await db.addMessage(convId, 'nova', humanized.content, { proactive: true, alert_type: 'urgent' });
                            console.log(`[Autonomy] delivered humanized message.`);
                        } catch (chatError) {
                            console.error(`[Autonomy] Failed to deliver message:`, chatError);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('[Autonomy] Heartbeat Failure:', error.message);
        }
    }
}

export const autonomyService = new AutonomyService();
