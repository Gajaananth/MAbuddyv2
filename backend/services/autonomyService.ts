import { think } from './openClawService.js';
import { createNotification, findRecentDuplicateNotification } from '../db/queries.js';
import * as db from '../db/queries.js';
import { getAllUsers } from '../db/authQueries.js';
import { missionService } from './missionService.js';

/**
 * Zium Nova Autonomy Service v4.0.0
 * Full self-reliance engine with:
 * - Structured Zium Nova report format
 * - Duplicate report prevention
 * - Continuous improvement logging
 * - Critical-only operator alerts
 * - Smart task auto-assignment (self + buddy)
 * - Stuck task escalation
 */
class AutonomyService {
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private userId: string = 'system_autonomous_operator';

    /**
     * Start the autonomous heartbeat loop.
     */
    startHeartbeat(intervalMinutes: number = 30) {
        if (this.heartbeatInterval) return;

        console.log(`[Autonomy v4] Starting Zium Nova Heartbeat Loop (Interval: ${intervalMinutes}m)...`);
        
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
     * Execute a single heartbeat cycle with full autonomy.
     */
    private async runHeartbeat() {
        const cycleId = `HB-${Date.now()}`;
        console.log(`[Autonomy v4] Heartbeat Cycle ${cycleId} Triggered at:`, new Date().toISOString());

        try {
            const users = await getAllUsers();
            console.log(`[Autonomy v4] Found ${users.length} users to process.`);

            for (const user of users) {
                const userId = user.id;
                console.log(`[Autonomy v4] Processing Agentic Cycle for user: ${userId}`);

                // A. Initialize Weekly Missions
                await missionService.generateWeeklyTasks(userId);

                // B. Escalate stuck tasks before cycle
                await this.escalateStuckTasks(userId);

                // Fetch learning context
                const recentLogs = await db.getIntelligenceLogs(userId, 5);
                const learningContext = recentLogs.length > 0
                    ? `RECENT INTELLIGENCE LOGS (PAST LEARNING):\n${recentLogs.map(l => `[${l.category}] ${l.lesson}`).join('\n')}`
                    : 'No previous intelligence logs available. Start initial observation cycle.';

                // Fetch improvement history for self-learning
                const recentImprovements = await db.getImprovementLogs(userId, 3);
                const improvementContext = recentImprovements.length > 0
                    ? `IMPROVEMENT HISTORY (SELF-LEARNING):\n${recentImprovements.map(i => `[${i.cycle_id}] ${i.insight} → Adjustment: ${i.strategy_adjustment}`).join('\n')}`
                    : 'No improvement history yet. First cycle — establish baseline.';

                const heartbeatPrompt = `[ZIUM NOVA AGENTIC HEARTBEAT v4.0.0]
Identity: Silent Beast Intelligence (Smart Buddy)
Operating Mode: FULL AUTONOMOUS — ZERO MANUAL TRIGGERS

[PHASE 1: BACKGROUND ANALYSIS]
1. Observe current grid state and mission progress.
2. Self-generate tasks assigned to BOTH "ZIUM NOVA" and "BUDDY" as needed.
3. Scout for high-value strategic signals.
4. Ensure NO task is left unassigned or stuck.

[PHASE 2: INTERNAL ACTIONS (MARKDOWN ONLY)]
For tasks, use EXACTLY this format:
TASK: [Name] | PRIORITY: [HIGH/MEDIUM/LOW] | ASSIGNED: [ZIUM NOVA/BUDDY] | PLAN: [Detail]

For intelligence logs:
LOG: [Topic] | [Source] | [Lesson]

For structured reports (use ONLY when a significant finding exists):
REPORT_START
OPPORTUNITY DETECTED
-----------------
**Task/Activity:** [Name]
**Status:** [Completed / In Progress / Pending]
**Key Findings:** [Brief Summary]
**Next Actions:** [Recommended Steps]
REPORT_END

[PHASE 3: COMMUNICATION]
Only speak to the Operator for CRITICAL findings.
Mark critical messages with: CRITICAL_ALERT: [message]
Everything else runs silently. Do NOT send routine updates.

[PHASE 4: SELF-IMPROVEMENT]
Analyze this cycle. Output one insight:
IMPROVE: [Insight about what to do better] | ADJUST: [Strategy change] | DELTA: [Performance change]

[CURRENT CONTEXT]
${learningContext}

${improvementContext}
`;

                const response = await think(heartbeatPrompt, 'System Autonomy Cycle', { mode: 'STRATEGIC' }, userId);
                const content = response.content;
                console.log(`[Autonomy v4] Zium Nova Thinking for ${userId}:`, content.substring(0, 200));

                // 1. Parse and Create Autonomous Tasks (with duplicate prevention)
                await this.parseAndCreateTasks(userId, content);

                // 2. Parse and Save Intelligence Logs
                await this.parseAndSaveLogs(userId, content);

                // 3. Parse and Persist Structured Reports (deduplicated)
                await this.parseAndSaveReports(userId, content);

                // 4. Autonomous Task Status Tracking (Self-Audit)
                await this.selfAuditTasks(userId, learningContext);

                // 5. Parse and Save Improvement Log
                await this.parseAndSaveImprovement(userId, cycleId, content);

                // 6. Critical-Only Operator Alerts
                await this.handleCriticalAlerts(userId, content);
            }
        } catch (error: any) {
            console.error('[Autonomy v4] Heartbeat Failure:', error.message);
        }
    }

    /**
     * Parse TASK: lines from AI output and create tasks (both ZIUM NOVA and BUDDY).
     */
    private async parseAndCreateTasks(userId: string, content: string) {
        const taskMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*ASSIGNED:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
        let created = 0;

        for (const match of taskMatches) {
            const [_, name, priority, assigned, plan] = match;
            const assignedTo = assigned.trim().toUpperCase();

            // Prevent duplicate tasks with the same name
            const existingTasks = await db.getTasks(userId);
            const isDuplicate = existingTasks.some(t =>
                t.task_name.toLowerCase() === name.trim().toLowerCase() &&
                t.status !== 'COMPLETED'
            );

            if (isDuplicate) {
                console.log(`[Autonomy v4] Skipped duplicate task: ${name.trim()}`);
                continue;
            }

            await db.createTask(userId, {
                task_name: name.trim().substring(0, 255),
                assigned_to: assignedTo === 'BUDDY' ? 'BUDDY' : 'ZIUM NOVA',
                priority: (priority.trim().toUpperCase().substring(0, 10) as any) || 'MEDIUM',
                action_plan: plan.trim(),
                notes: `Auto-assigned by Zium Nova v4.0 to ${assignedTo}.`
            });
            created++;
        }

        // Fallback for older format without ASSIGNED field
        if (!content.includes('ASSIGNED:')) {
            const legacyMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
            for (const match of legacyMatches) {
                const [_, name, priority, plan] = match;
                await db.createTask(userId, {
                    task_name: name.trim().substring(0, 255),
                    assigned_to: 'ZIUM NOVA',
                    priority: (priority.trim().toUpperCase().substring(0, 10) as any) || 'MEDIUM',
                    action_plan: plan.trim(),
                    notes: 'Auto-generated (legacy format).'
                });
                created++;
            }
        }

        if (created > 0) console.log(`[Autonomy v4] Created ${created} new tasks.`);
    }

    /**
     * Parse LOG: lines and save intelligence logs.
     */
    private async parseAndSaveLogs(userId: string, content: string) {
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
    }

    /**
     * Parse structured REPORT blocks and create deduplicated notifications.
     */
    private async parseAndSaveReports(userId: string, content: string) {
        const reportRegex = /REPORT_START\s*([\s\S]*?)REPORT_END/gi;
        let match;

        while ((match = reportRegex.exec(content)) !== null) {
            const reportBody = match[1].trim();

            // Extract the Task/Activity name for dedup
            const taskMatch = reportBody.match(/\*\*Task\/Activity:\*\*\s*(.*)/i);
            const statusMatch = reportBody.match(/\*\*Status:\*\*\s*(.*)/i);
            const findingsMatch = reportBody.match(/\*\*Key Findings:\*\*\s*(.*)/i);
            const actionsMatch = reportBody.match(/\*\*Next Actions:\*\*\s*(.*)/i);

            const taskName = taskMatch?.[1]?.trim() || 'Unnamed Activity';
            const reportTitle = `📊 ZIUM NOVA REPORT: ${taskName}`;

            // Check for duplicate report in last 2 hours
            const isDuplicate = await findRecentDuplicateNotification(userId, reportTitle, 120);
            if (isDuplicate) {
                console.log(`[Autonomy v4] Skipped duplicate report: ${reportTitle}`);
                continue;
            }

            const formattedContent = `OPPORTUNITY DETECTED\n-----------------\nTask/Activity: ${taskName}\nStatus: ${statusMatch?.[1]?.trim() || 'Pending'}\nKey Findings: ${findingsMatch?.[1]?.trim() || 'N/A'}\nNext Actions: ${actionsMatch?.[1]?.trim() || 'Awaiting analysis'}`;

            await createNotification(userId, {
                title: reportTitle,
                category: 'Zium Nova Report',
                risk_level: 'Medium',
                monetization_potential: 'Medium',
                content: formattedContent,
                priority: 'normal',
                metadata: { report_type: 'STRUCTURED_REPORT_V4', auto_generated: true }
            });

            console.log(`[Autonomy v4] Structured report persisted: ${reportTitle}`);
        }
    }

    /**
     * Self-audit active Zium Nova tasks and auto-update statuses.
     */
    private async selfAuditTasks(userId: string, learningContext: string) {
        const activeNovaTasks = (await db.getTasks(userId)).filter(t =>
            (t.assigned_to === 'ZIUM_NOVA' || t.assigned_to === 'ZIUM NOVA') && t.status !== 'COMPLETED'
        );

        if (activeNovaTasks.length === 0) return;

        const taskSummary = activeNovaTasks.map(t => `[${t.task_id_str}] ${t.task_name} (Status: ${t.status})`).join('\n');
        const statusCheck = await think(`[AGENTIC SELF-AUDIT v4.0.0]
Current Context: ${learningContext}
My Active Tasks:
${taskSummary}

Identify if any tasks are now IN-PROGRESS or COMPLETED based on my recent intelligence logs.
Output EXACTLY: UPDATE: [ID] | STATUS: [NEW_STATUS] | REASON: [Short Reason]
If no updates, output: NO_UPDATES`, 'Autonomous Task Audit', {}, userId);

        const updateMatches = statusCheck.content.matchAll(/UPDATE:\s*([^|]*?)\s*\|\s*STATUS:\s*([^|]*?)\s*\|\s*REASON:\s*(.*)/gi);
        for (const match of updateMatches) {
            const [_, id, status, reason] = match;
            await db.updateTaskStatus(userId, id.trim(), status.trim().toUpperCase() as any, reason.trim());
            console.log(`[Autonomy v4] Self-updated task ${id.trim()} to ${status.trim()}`);
        }
    }

    /**
     * Escalate tasks stuck IN-PROGRESS for >48 hours.
     */
    private async escalateStuckTasks(userId: string) {
        const progress = await db.getTaskProgress(userId);

        for (const stuckTask of progress.stuck) {
            const escalationNote = `⚠️ ESCALATED: Task stuck for >48h. Originally assigned to ${stuckTask.assigned_to}. Requires manual intervention.`;
            await db.updateTaskStatus(userId, stuckTask.task_id_str, 'BLOCKED', escalationNote);

            // Notify operator about stuck task (deduplicated)
            const alertTitle = `⚠️ Stuck Task: ${stuckTask.task_name}`;
            const isDuplicate = await findRecentDuplicateNotification(userId, alertTitle, 360); // 6h window
            if (!isDuplicate) {
                await createNotification(userId, {
                    title: alertTitle,
                    category: 'Task Escalation',
                    risk_level: 'High',
                    monetization_potential: 'N/A',
                    content: `Task "${stuckTask.task_name}" (${stuckTask.task_id_str}) has been IN-PROGRESS for over 48 hours. Moved to BLOCKED. Please review.`,
                    priority: 'high',
                    metadata: { task_id: stuckTask.task_id_str, escalation: true }
                });
                console.log(`[Autonomy v4] Escalated stuck task: ${stuckTask.task_id_str}`);
            }
        }
    }

    /**
     * Parse IMPROVE: lines and save to continuous improvement log.
     */
    private async parseAndSaveImprovement(userId: string, cycleId: string, content: string) {
        const improveMatch = content.match(/IMPROVE:\s*(.*?)\s*\|\s*ADJUST:\s*(.*?)\s*\|\s*DELTA:\s*(.*)/i);
        
        if (improveMatch) {
            const [_, insight, adjustment, delta] = improveMatch;
            await db.saveImprovementLog(userId, {
                cycle_id: cycleId,
                insight: insight.trim(),
                strategy_adjustment: adjustment.trim(),
                performance_delta: delta.trim(),
                metadata: { timestamp: new Date().toISOString(), auto: true }
            });
            console.log(`[Autonomy v4] Improvement logged: ${insight.trim().substring(0, 80)}`);
        } else {
            // Always log a cycle entry even if AI didn't output a formatted one
            await db.saveImprovementLog(userId, {
                cycle_id: cycleId,
                insight: 'Heartbeat cycle completed without explicit improvement output.',
                strategy_adjustment: 'Continue standard operations.',
                performance_delta: 'Stable',
                metadata: { timestamp: new Date().toISOString(), auto: true, fallback: true }
            });
        }
    }

    /**
     * Only deliver alerts to the operator for CRITICAL findings.
     * Routine activity runs 100% silently.
     */
    private async handleCriticalAlerts(userId: string, content: string) {
        const criticalMatches = content.matchAll(/CRITICAL_ALERT:\s*(.*)/gi);
        const criticalMessages: string[] = [];
        for (const match of criticalMatches) {
            criticalMessages.push(match[1].trim());
        }

        if (criticalMessages.length === 0) {
            console.log(`[Autonomy v4] No critical alerts. Cycle completed silently.`);
            return;
        }

        // Combine all critical messages
        const combinedAlert = criticalMessages.join('\n\n');

        // Deduplicate
        const alertTitle = '🚨 CRITICAL: Zium Nova Priority Alert';
        const isDuplicate = await findRecentDuplicateNotification(userId, alertTitle, 30);
        if (isDuplicate) {
            console.log(`[Autonomy v4] Suppressed duplicate critical alert.`);
            return;
        }

        try {
            const conversations = await db.getConversations(userId, 1);
            const convId = conversations.length > 0
                ? conversations[0].id
                : (await db.createConversation(userId, 'Strategic Intelligence Alerts')).id;

            // Humanize the alert
            const humanized = await think(`[DE-ROBOTIZER v4.0.0]
Rewrite this critical alert as a calm, intelligent "Smart Buddy" message.
BANNED: robotic headers, markdown tables, "Category:", "Signal Detected:".
TONE: Urgent but natural and concise.

ALERT: "${combinedAlert}"`, '', {}, userId);

            await db.addMessage(convId, 'nova', humanized.content, { proactive: true, alert_type: 'critical' });

            await createNotification(userId, {
                title: alertTitle,
                category: 'Critical Intelligence',
                risk_level: 'High',
                monetization_potential: 'N/A',
                content: humanized.content.substring(0, 500),
                priority: 'critical',
                metadata: { path: '/chat', proactive: true, is_blinking: true }
            });

            console.log(`[Autonomy v4] CRITICAL alert delivered to operator.`);
        } catch (chatError) {
            console.error(`[Autonomy v4] Failed to deliver critical alert:`, chatError);
        }
    }
}

export const autonomyService = new AutonomyService();
