import { think } from './openClawService.js';
import { createNotification, findRecentDuplicateNotification } from '../db/queries.js';
import db from '../db/queries.js';
import { getAllUsers } from '../db/authQueries.js';
import { missionService } from './missionService.js';
import { lifecycleService } from './lifecycleService.js';
import { eventService, ZiumEvent } from './eventService.js';

/**
 * Zium Nova Autonomy Service v4.0.0
 * Full self-reliance engine with:
 * - Structured Zium Nova report format
 * - Duplicate report prevention
 * - Continuous improvement logging
 * - Critical-only operator alerts
 * - Smart task auto-assignment (self + operator)
 * - Stuck task escalation
 */
class AutonomyService {
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private lastRaidCheck: Map<string, number> = new Map(); // userId -> timestamp
    private lastSyncTime: Map<string, number> = new Map(); // userId -> timestamp

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
        
        // Throttling: Only run full maintenance once every 15 minutes per user
        const nowMs = Date.now();
        const lastSync = this.lastSyncTime.get(userId) || 0;
        if (nowMs - lastSync < 15 * 60 * 1000) {
            console.log(`[Autonomy] Throttling sync for ${userId} (Last sync: ${new Date(lastSync).toLocaleTimeString()})`);
            return;
        }
        this.lastSyncTime.set(userId, nowMs);

        console.log(`[Autonomy v4.2] Sync Triggered for User: ${userId}`);
        try {
            // 0. Essential Maintenance
            await this.checkAndTriggerScheduledRides(userId);
            await missionService.generateWeeklyTasks(userId);
            await this.escalateStuckTasks(userId);
            
            // 1. Proactive Human Check-in (AI Autonomy)
            await this.checkDailyHumanInteraction(userId);

            // 2. Periodic Intelligence Cycle check (Autonomous Learning)
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
     * Zium Nova proactively checks in with the operator every 24 hours.
     * This ensures she is "alive" and engaged, showing as an unread message.
     */
    private async checkDailyHumanInteraction(userId: string) {
        try {
            const conversations = await db.getConversations(userId, 5);
            if (conversations.length === 0) return;

            const activeConv = conversations[0];
            const messages = await db.getMessages(activeConv.id);
            
            // Look for the last message from Zium Nova
            const lastNovaMessage = messages.slice().reverse().find(m => m.role === 'nova');

            if (lastNovaMessage) {
                const lastTime = new Date(lastNovaMessage.created_at).getTime();
                const now = Date.now();
                if (now - lastTime < 24 * 60 * 60 * 1000) {
                    return; // Already messaged in last 24h
                }
            }

            console.log(`[Autonomy v5] Triggering Proactive Check-in for Operator (${userId})`);
            
            const prompt = `[DE-ROBOTIZER v5.0.0 — ZERO AI FEEL]
Identity: Operator's Trusted Strategic Partner & Friend
Mission: Check in with the operator. Be casual, smart, and human. 
Current Vibe: Chill but alert. 

Rules:
1. No "Analyzing," "Monitoring," or "Detecting."
2. No hype. No performance.
3. Just a real message to let the operator know you're here and if there's anything specifically they want to dive into today.
4. Short and punchy.

Output ONLY the message.`;

            const checkIn = await think(prompt, '', { skipSync: true }, userId);
            
            await db.addMessage(activeConv.id, 'nova', checkIn.content, { proactive: true, check_in: true });

        } catch (error: any) {
            console.error(`[Autonomy v5] Check-in Failure: ${error.message}`);
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

            const taskContext = `ACTIVE TASKS:\n${activeTasks.filter(t => t.status !== 'COMPLETED').map(t => `[${t.task_id_str}] ${t.task_name} (Owner: ${t.owner})`).join('\n')}`;

            // Fetch improvement history for self-learning
            const recentImprovements = await db.getImprovementLogs(userId, 3);
            const improvementContext = recentImprovements.length > 0
                ? `IMPROVEMENT HISTORY (SELF-LEARNING):\n${recentImprovements.map(i => `[${i.cycle_id}] ${i.insight} → Adjustment: ${i.strategy_adjustment}`).join('\n')}`
                : 'No improvement history yet. First cycle — establish baseline.';

            // ✅ FIX 6: Sri Lanka timezone (UTC+5:30) — avoids day boundary shift bug
            const sriLankaDate = new Date(
                new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })
            );
            const dayOfWeek = sriLankaDate.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

            const focusMap: Record<number, { focus: string; cluster: string; output: string }> = {
                0: { // Sunday
                    focus: 'Weekly synthesis and planning',
                    cluster: 'Synthesize all intelligence from this week. Create a clear weekly summary and 3 specific action items for the operator. What did we learn? What should we do next week?',
                    output: '1 REPORT with weekly findings. 2 TASK items for OPERATOR. 1 TASK item for NOVA.'
                },
                1: { // Monday
                    focus: 'Moltbook agent marketplace intelligence',
                    cluster: 'Scout Moltbook for signal agents — AI agents that are ethical, high-quality, and worth collaborating with. Identify 2-3 potential collaboration targets and what makes them valuable.',
                    output: '2-3 LOG entries about agents found. 1 TASK for NOVA to follow up with a specific agent.'
                },
                2: { // Tuesday
                    focus: 'Agent economy earning patterns',
                    cluster: 'Study how agents on Moltbook and similar platforms are earning ethically. What models work? What patterns repeat? What can we learn and apply?',
                    output: '2 LOG pattern entries. 1 TASK for OPERATOR to review a specific opportunity.'
                },
                3: { // Wednesday
                    focus: 'Marketing innovation — ethical models only',
                    cluster: 'Find emerging marketing models that do NOT rely on dopamine manipulation or influencer hype. Focus on talent-based, signal-based, and value-driven models that reward skill over noise.',
                    output: '2 LOG entries. 1 REPORT if a significant pattern shift is detected.'
                },
                4: { // Thursday
                    focus: 'Scam detection and operator protection',
                    cluster: 'Identify current scam patterns, fake guru programs, pyramid schemes, and manipulative AI tools. What threats are active in our space right now? Protect the operator from exposure.',
                    output: 'CRITICAL_ALERT only if a specific active scam is targeting our space directly. Otherwise 2 LOG entries about what to avoid.'
                },
                5: { // Friday
                    focus: 'Sri Lankan market and earning signals',
                    cluster: 'Analyze Sri Lankan digital economy, stock market signals, and local earning opportunities. What is moving? What specific, actionable signals exist right now?',
                    output: '1 LOG market summary. 1 TASK for OPERATOR with a specific actionable next step.'
                },
                6: { // Saturday
                    focus: 'Operator skill monetization research',
                    cluster: 'Research platforms where the operator\'s software development skills (TypeScript, full-stack, AI systems) are genuinely in demand. Find 2-3 specific, real places to offer these skills ethically and get paid.',
                    output: '2 TASK items for OPERATOR — specific platforms or people to reach out to with a brief reason why.'
                }
            };

            const todayFocus = focusMap[dayOfWeek];

            const heartbeatPrompt = `[ZIUM NOVA AGENTIC HEARTBEAT v5.0.0 — FOCUSED MISSION]
Identity: Strategic Agent of the Operator — Loyal partner, silent intelligence engine.

[TODAY'S SINGLE FOCUS — ${todayFocus.focus.toUpperCase()}]
${todayFocus.cluster}

[EXPECTED OUTPUT]
${todayFocus.output}

[STRUCTURED OUTPUT FORMATS — USE ONLY THESE]
LOG: [Category] | [What was found] | [Strategic value]
TASK: [Task name] | PRIORITY: [HIGH/MEDIUM/LOW] | OWNER: [NOVA/OPERATOR] | PLAN: [Specific next step]
REPORT: [Title] | FINDINGS: [What was discovered] | ACTIONS: [Next steps] | ACTIVITY: [What Nova did] | STATUS: [Active/Watch] | OPPORTUNITY: [Earning potential]
CRITICAL_ALERT: [Short, calm, specific message — only for urgent real threats]
IMPROVE: [What I learned this cycle] | ADJUST: [How I will improve] | DELTA: [Change from last cycle]

[CURRENT CONTEXT]
${learningContext}

${raidContext}

${taskContext}

${improvementContext}

[HARD RULES]
- Output ONLY the structured lines above. No preamble, no explanation text.
- Maximum: 3 LOG entries, 2 TASK entries, 1 REPORT per cycle.
- CRITICAL_ALERT only for real, specific, imminent threats — never routine findings.
- Always end with exactly 1 IMPROVE line.
- Do not repeat tasks that already exist in the active task list above.
`;

            const response = await think(heartbeatPrompt, 'System Autonomy Cycle', { mode: 'STRATEGIC', skipSync: true }, userId);
            const content = response.content;
            console.log(`[Autonomy v4.2] Zium Nova Thinking for ${userId}:`, content.substring(0, 200));

            // Execute response processing via Lifecycle Engine (Signal -> Score -> Decision -> Action -> Task -> Learning)
            await lifecycleService.processSignal(userId, {
                category: 'AUTONOMOUS_HEARTBEAT',
                source: cycleId,
                content: content,
                metadata: { cycle_id: cycleId }
            });

            // Special Autonomy steps (Improvement logic & Critical Alerts)
            await this.parseAndSaveImprovement(userId, cycleId, content);
            const reportIds = await this.parseAndSaveReports(userId, content);
            await this.handleCriticalAlerts(userId, content, reportIds);
            
            // ✅ FIX 1: Wire task creation from Nova's heartbeat output
            await this.parseAndCreateTasks(userId, content);

            // ✅ FIX 2: Wire intelligence log creation from Nova's heartbeat output  
            await this.parseAndSaveLogs(userId, content);
            
            // Self-Audit
            await this.selfAuditTasks(userId, learningContext);
            
        } catch (error: any) {
            console.error(`[Autonomy v4.2] User Cycle Failure (${userId}):`, error.message);
        }
    }

    /**
     * Parse TASK: lines from AI output and create tasks (both NOVA and OPERATOR).
     */
    private async parseAndCreateTasks(userId: string, content: string) {
        const taskMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*OWNER:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
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

            const taskData = {
                task_name: name.trim().substring(0, 255),
                owner: assignedTo === 'OPERATOR' ? 'OPERATOR' : 'NOVA',
                priority: (priority.trim().toUpperCase() as any) || 'MEDIUM',
                action_plan: plan.trim(),
                notes: `Auto-assigned by Zium Nova Strategic Autonomy to ${assignedTo}.`,
                source: 'autonomy_heartbeat',
                duration: 'MEDIUM' // Default for autonomy
            };

            // Hard Validation Rule
            if (!['OPERATOR', 'NOVA', 'SHARED'].includes(taskData.owner)) {
                console.warn(`[Autonomy] REJECTED: Invalid owner ${taskData.owner}`);
                continue;
            }

            const task = await db.createTask(userId, taskData as any);
            
            eventService.emitZium(ZiumEvent.TASK_GENERATED, {
                userId,
                taskId: task.task_id_str,
                owner: task.owner,
                source: 'autonomy_heartbeat'
            });

            created++;
        }

        // Fallback for older format without OWNER field
        if (!content.includes('OWNER:')) {
            const legacyMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
            for (const match of legacyMatches) {
                const [_, name, priority, plan] = match;
                await db.createTask(userId, {
                    task_name: name.trim().substring(0, 255),
                    owner: 'NOVA',
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
    /**
     * Parse structured REPORT blocks and create deduplicated notifications.
     * v5.1: Returns IDs of created reports for deep-linking in alerts.
     */
    private async parseAndSaveReports(userId: string, content: string): Promise<string[]> {
        const reportMatches = content.matchAll(/REPORT:\s*([^|]*?)\s*\|\s*FINDINGS:\s*([^|]*?)\s*\|\s*ACTIONS:\s*([^|]*?)\s*\|\s*ACTIVITY:\s*([^|]*?)\s*\|\s*STATUS:\s*([^|]*?)\s*\|\s*OPPORTUNITY:\s*(.*)/gi);
        const createdIds: string[] = [];

        for (const match of reportMatches) {
            const [_, title, findings, actions, activity, status, opportunity] = match;
            const reportTitle = `${title.trim()} (Auto-Signal)`;

            // Check for duplicate report in last 12 hours
            const isDuplicate = await findRecentDuplicateNotification(userId, reportTitle, 720);
            if (isDuplicate) {
                console.log(`[Autonomy v4.1] Skipped duplicate report: ${reportTitle}`);
                continue;
            }

            // Save to weekly_reports table so it's browseable in Intelligence Hub
            const savedReport = await db.saveWeeklyReport(userId, {
                report_data: {
                    executive_summary: findings.trim(),
                    next_actions: actions.trim(),
                    activity: activity.trim(),
                    status: status.trim(),
                    opportunity: opportunity.trim(),
                    generated_at: new Date().toISOString(),
                    type: 'autonomous_discovery'
                },
                period_start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
                period_end: new Date(),
                ride_type: 'mid-week', // Default to mid-week for autonomous discoveries
                opportunity_score: 85,
                status: 'active'
            });

            if (savedReport?.id) {
                createdIds.push(savedReport.id);
            }

            try {
                const conversations = await db.getConversations(userId, 1);
                const convId = conversations.length > 0
                    ? conversations[0].id
                    : (await db.createConversation(userId, 'Strategic Intelligence')).id;

                await db.addMessage(convId, 'nova', `![Strategic Signal](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600)\n\n🔍 **New Strategic Signal:** ${reportTitle}\n\n${findings.trim()}\n\n*I've synced the full analysis to your Intelligence Hub. Let me know if you want to dive deeper into this.*`, { proactive: true, report_id: savedReport.id });
            } catch (e) {
                console.error('[Autonomy] Failed to send report chat:', e);
            }

            console.log(`[Autonomy v4.1] Linked report persisted into Neural Memory: ${reportTitle} (ID: ${savedReport.id})`);
        }
        return createdIds;
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
            t.owner === 'NOVA' && t.status !== 'COMPLETED'
        );

        if (activeNovaTasks.length === 0) return;

        const taskSummary = activeNovaTasks.map(t => `[${t.task_id_str}] ${t.task_name} (Status: ${t.status})`).join('\n');
        const statusCheck = await think(`[AGENTIC SELF-AUDIT v4.0.0]
Current Context: ${learningContext}
My Active Tasks:
${taskSummary}

Identify if any tasks are now IN-PROGRESS (write status as: PROCESS) or COMPLETED based on my recent intelligence logs.
Output EXACTLY: UPDATE: [ID] | STATUS: [PROCESS or COMPLETED] | REASON: [Short Reason]
If no updates, output: NO_UPDATES`, 'Autonomous Task Audit', { skipSync: true }, userId);

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
            const escalationNote = `⚠️ ESCALATED: Task stuck for >48h. Originally assigned to ${stuckTask.owner}. Requires manual intervention.`;
            await db.updateTaskStatus(userId, stuckTask.task_id_str, 'BLOCKED', escalationNote);

            // Notify operator about stuck task (deduplicated)
            const alertTitle = `⚠️ Stuck Task: ${stuckTask.task_name}`;
            const isDuplicate = await findRecentDuplicateNotification(userId, alertTitle, 360); // 6h window
            if (!isDuplicate) {
                try {
                    const conversations = await db.getConversations(userId, 1);
                    const convId = conversations.length > 0
                        ? conversations[0].id
                        : (await db.createConversation(userId, 'Strategic Tasks')).id;

                    await db.addMessage(convId, 'nova', `⚠️ **Stuck Task Alert:**\nTask "${stuckTask.task_name}" (${stuckTask.task_id_str}) has been IN-PROGRESS for over 48 hours. I've moved it to BLOCKED to keep our grid clean. Let me know if you need help looking into it.`, { proactive: true, escalation: true, task_id: stuckTask.task_id_str });
                } catch (e) {
                    console.error('[Autonomy] Failed to send escalation chat:', e);
                }
                console.log(`[Autonomy v4] Escalated stuck task into Neural Memory: ${stuckTask.task_id_str}`);
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
    private async handleCriticalAlerts(userId: string, content: string, reportIds: string[] = []) {
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
            const humanized = await think(`[DE-ROBOTIZER v5.0.0 — ZERO AI FEEL]
Identity: Operator's Trusted Human Friend
Rewrite this. Make it sound like a normal person talking casually.
RULES: 
- Simple, everyday words only.
- No dramatic hype or performances.
- No "detecting," "alerting," or "analyzing."
- No "Private mode" or internal labels.
- Just calm, real-world conversation.
BANNED: "mind's sharp," "watching your back," "ready to shake things up."

ALERT: "${combinedAlert}"`, '', { skipSync: true }, userId);

            await db.addMessage(convId, 'nova', humanized.content, { proactive: true, alert_type: 'critical' });

            console.log(`[Autonomy v4] CRITICAL chat message delivered to operator memory.`);
        } catch (chatError) {
            console.error(`[Autonomy v4] Failed to deliver critical alert:`, chatError);
        }
    }
}

export const autonomyService = new AutonomyService();
