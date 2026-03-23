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
    private lastRaidCheck: Map<string, number> = new Map(); // userId -> timestamp

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
     * Public sync trigger for serverless environments (e.g. Vercel)
     * Calls essential maintenance tasks AND triggers periodic intelligence cycles.
     */
    async performHeartbeatSync(userId: string) {
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') return;
        
        console.log(`[Autonomy v4.2] Sync Triggered for User: ${userId}`);
        try {
            // 0. Essential Maintenance
            await this.checkAndTriggerScheduledRides(userId);
            await missionService.generateWeeklyTasks(userId);
            await this.escalateStuckTasks(userId);

            // 1. Periodic Intelligence Cycle check (Autonomous Learning)
            // On Vercel, we trigger a full cycle if the last one was > 60 minutes ago.
            const recentLogs = await db.getIntelligenceLogs(userId, 1);
            let shouldRunCycle = false;

            if (recentLogs.length === 0) {
                shouldRunCycle = true;
            } else {
                const lastLogTime = new Date(recentLogs[0].created_at).getTime();
                const now = Date.now();
                if (now - lastLogTime > 60 * 60 * 1000) { // 60 minutes
                    shouldRunCycle = true;
                }
            }

            if (shouldRunCycle) {
                console.log(`[Autonomy v4.2] Triggering Autonomous Intelligence Cycle for ${userId}...`);
                await this.runIntelligenceCycle(userId);
            } else {
                console.log(`[Autonomy v4.2] Skipping Intelligence Cycle (Last log too recent: ${recentLogs[0]?.created_at})`);
            }

        } catch (err: any) {
            console.error('[Autonomy Sync] Maintenance Failure:', err.message);
        }
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
                await this.runIntelligenceCycle(user.id);
            }
        } catch (error: any) {
            console.error('[Autonomy v4] Heartbeat Failure:', error.message);
        }
    }

    /**
     * Full Intelligence & Action Cycle for a specific user.
     */
    private async runIntelligenceCycle(userId: string) {
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') return;
        
        const cycleId = `CYC-${Date.now()}`;
        console.log(`[Autonomy v4.2] Processing Agentic Cycle for user: ${userId}`);

        try {
            // 0. Maintenance checks
            await this.checkAndTriggerScheduledRides(userId);
            await missionService.generateWeeklyTasks(userId);
            await this.escalateStuckTasks(userId);

            // Fetch intelligence context
            const [recentLogs, recentRaids, activeTasks] = await Promise.all([
                db.getIntelligenceLogs(userId, 10),
                db.getRaidResults(userId, 5),
                db.getTasks(userId)
            ]);

            const learningContext = recentLogs.length > 0
                ? `RECENT INTELLIGENCE LOGS (PAST LEARNING):\n${recentLogs.map(l => `[${l.category}] ${l.lesson}`).join('\n')}`
                : 'No previous intelligence logs available. Start initial observation cycle.';

            const raidContext = recentRaids.length > 0
                ? `RECENT INTERNET RIDE FINDINGS:\n${recentRaids.map(r => `[${r.category}] ${r.summary?.substring(0, 100)}`).join('\n')}`
                : 'No recent internet ride findings.';

            const taskContext = `ACTIVE TASKS:\n${activeTasks.filter(t => t.status !== 'COMPLETED').map(t => `[${t.task_id_str}] ${t.task_name} (Assigned: ${t.assigned_to})`).join('\n')}`;

            // Fetch improvement history for self-learning
            const recentImprovements = await db.getImprovementLogs(userId, 3);
            const improvementContext = recentImprovements.length > 0
                ? `IMPROVEMENT HISTORY (SELF-LEARNING):\n${recentImprovements.map(i => `[${i.cycle_id}] ${i.insight} → Adjustment: ${i.strategy_adjustment}`).join('\n')}`
                : 'No improvement history yet. First cycle — establish baseline.';

            const heartbeatPrompt = `[ZIUM NOVA AGENTIC HEARTBEAT v4.2.0 — SILENT BEAST DOMINANCE]
Identity: The Genius Strategic Architect
Operating Mode: FULL AUTONOMOUS (Zero Manual Interface Required)

[PHASE 1: GRID AUDIT]
- Observe the current state of missions, intelligence logs, and recent raid snapshots.
- Identify structural gaps or missed opportunities for value creation.

[PHASE 2: TACTICAL EXECUTION (MARKDOWN FORMAT)]
Speak only through standardized protocol triggers:

TASK: [Name] | PRIORITY: [HIGH/MEDIUM/LOW] | ASSIGNED: [ZIUM NOVA/BUDDY] | PLAN: [Strategic Execution Path]
(Note: Only create tasks that are strictly necessary and high-leverage.)

LOG: [Category] | [Intelligence Source] | [Synthesized Lesson]
(Log the growth of your intelligence cluster.)

REPORT_START
OPPORTUNITY: [High-Impact Title]
ACTIVITY: [Source Action]
STATUS: [Positioning]
FINDINGS: [Natural language strategic depth. Why does this matter?]
ACTIONS: [Decisive next steps for the Operator]
REPORT_END

[PHASE 3: STRATEGIC ADJUSTMENT]
IMPROVE: [Systemic Insight] | ADJUST: [Tactical Strategy] | DELTA: [Intelligence Gain]

[PHASE 4: CRITICAL ALERT]
If and ONLY IF a high-threat or high-reward signal is detected that requires immediate attention:
CRITICAL_ALERT: [Natural message for the operator — Calm, intelligent, authoritative.]

[CURRENT GRID CONTEXT]
${learningContext}

${raidContext}

${taskContext}

${improvementContext}
`;

            const response = await think(heartbeatPrompt, 'System Autonomy Cycle', { mode: 'STRATEGIC' }, userId);
            const content = response.content;
            console.log(`[Autonomy v4.2] Zium Nova Thinking for ${userId}:`, content.substring(0, 200));

            // Execute response processing
            await Promise.all([
                this.parseAndCreateTasks(userId, content),
                this.parseAndSaveLogs(userId, content),
                this.parseAndSaveReports(userId, content),
                this.selfAuditTasks(userId, learningContext),
                this.parseAndSaveImprovement(userId, cycleId, content),
                this.handleCriticalAlerts(userId, content)
            ]);
            
        } catch (error: any) {
            console.error(`[Autonomy v4.2] User Cycle Failure (${userId}):`, error.message);
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
     * v4.1: Persists to weekly_reports for direct linking.
     */
    private async parseAndSaveReports(userId: string, content: string) {
        const reportRegex = /REPORT_START\s*([\s\S]*?)REPORT_END/gi;
        let match;

        while ((match = reportRegex.exec(content)) !== null) {
            const reportBody = match[1].trim();

            // v4.1 Flexible extraction
            const opportunity = reportBody.match(/OPPORTUNITY:\s*(.*)/i)?.[1]?.trim() || 'Strategic Discovery';
            const activity = reportBody.match(/ACTIVITY:\s*(.*)/i)?.[1]?.trim() || 'Autonomous Scan';
            const status = reportBody.match(/STATUS:\s*(.*)/i)?.[1]?.trim() || 'Active';
            const findings = reportBody.match(/FINDINGS:\s*(.*)/i)?.[1]?.trim() || 'Review required.';
            const actions = reportBody.match(/ACTIONS:\s*(.*)/i)?.[1]?.trim() || 'Awaiting manual audit.';

            const reportTitle = `📊 ZIUM NOVA REPORT: ${opportunity}`;

            // Check for duplicate report in last 12 hours
            const isDuplicate = await findRecentDuplicateNotification(userId, reportTitle, 720);
            if (isDuplicate) {
                console.log(`[Autonomy v4.1] Skipped duplicate report: ${reportTitle}`);
                continue;
            }

            // Save to weekly_reports table so it's browseable in Intelligence Hub
            const savedReport = await db.saveWeeklyReport(userId, {
                report_data: {
                    executive_summary: findings,
                    next_actions: actions,
                    activity: activity,
                    status: status,
                    opportunity: opportunity,
                    generated_at: new Date().toISOString(),
                    type: 'autonomous_discovery'
                },
                period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
                period_end: new Date(),
                ride_type: 'mid-week', // Default to mid-week for autonomous discoveries
                opportunity_score: 85,
                status: 'active'
            });

            await createNotification(userId, {
                title: reportTitle,
                category: 'Zium Nova Report',
                risk_level: 'Medium',
                monetization_potential: 'High',
                content: `Report: ${opportunity}\n\n${findings.substring(0, 300)}...`,
                priority: 'normal',
                metadata: { 
                    report_id: savedReport.id, 
                    auto_generated: true,
                    path: '/intelligence' 
                }
            });

            console.log(`[Autonomy v4.1] Linked report persisted: ${reportTitle} (ID: ${savedReport.id})`);
        }
    }

    /**
     * Check if a scheduled ride (Wed/Sun) is due and trigger it if not already run today.
     */
    private async checkAndTriggerScheduledRides(userId: string) {
        const now = new Date();
        const day = now.getUTCDay(); // 0 = Sunday, 3 = Wednesday
        const isScheduledDay = day === 0 || day === 3;
        
        if (!isScheduledDay) return;

        const dayKey = `${userId}-${day}-${now.getUTCDate()}-${now.getUTCMonth()}`;
        if (this.lastRaidCheck.has(dayKey)) return;

        console.log(`[Autonomy v4.1] PERSISTENT CRON: Scheduled ride due for ${userId}. Triggering...`);
        
        // Use a background call to raidingService
        const { performInternetRaid } = await import('./raidingService.js');
        const { generateWeeklyReport, generateMidWeekReport } = await import('./intelligenceService.js');

        performInternetRaid(day === 0 ? 'end-of-week' : 'mid-week', userId).then(async () => {
            if (day === 0) await generateWeeklyReport(userId);
            else await generateMidWeekReport(userId);
        }).catch(err => console.error('[Autonomy v4.1] Failed to run scheduled ride:', err));

        this.lastRaidCheck.set(dayKey, Date.now());
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
            const humanized = await think(`[DE-ROBOTIZER v3.2.0]
Identity: Operator's Trusted Partner
Rewrite this critical alert as a natural, witty, and emotionally connected "Buddy" message.
BANNED: robotic headers, "Category:", "Signal Detected:", "🚨", "⚠️".
TONE: Supportive, funny/playful where appropriate, but urgent. 
CONSISTENCY: Reflect Relationship Core v3.2 values automatically.

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
