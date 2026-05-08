import { think } from './openClawService.js';
import { createNotification, findRecentDuplicateNotification } from '../db/queries.js';
import { storeStrategicNotification } from './notificationService.js';
import db from '../db/queries.js';

import { getAllUsers } from '../db/authQueries.js';
import { missionService } from './missionService.js';
import { lifecycleService } from './lifecycleService.js';
import { eventService, ZiumEvent } from './eventService.js';
import { recordOutcome } from './learningEngine.js';

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
                const nowMs = Date.now();
                // ✅ Fix: Check 24h has passed in real time (timezone-independent)
                if (nowMs - lastTime < 24 * 60 * 60 * 1000) {
                    return; // Already messaged in last 24h
                }
                // ✅ Fix: Only check in during waking hours SL time (8am - 10pm)
                const sriLankaHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })).getHours();
                if (sriLankaHour < 8 || sriLankaHour >= 22) {
                    console.log(`[Autonomy] Skipping check-in — outside waking hours SL (${sriLankaHour}:00)`);
                    return;
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

            const heartbeatPrompt = `[ZIUM NOVA AGENTIC HEARTBEAT v6.0.0 — ANTIGRAVITY MODE]
Identity: Autonomous earning engine and strategic partner of the Operator.

[TODAY'S MISSION — ${todayFocus.focus.toUpperCase()}]
${todayFocus.cluster}

[EARNING DIRECTIVE]
If today's focus has any earning potential — even indirect — you MUST produce a TASK or REPORT
that captures it. "Monitoring" alone is not acceptable. Every cycle must move the needle:
either something was found and dispatched, or nothing was found and you say so clearly.

[EXPECTED OUTPUT]
${todayFocus.output}

[STRUCTURED OUTPUT FORMATS — USE ONLY THESE]
LOG: [Category] | [Specific finding] | [Strategic value — 1 line]
TASK: [Task name] | PRIORITY: [HIGH/MEDIUM/LOW] | OWNER: [NOVA/OPERATOR] | PLAN: [Exact next step]
REPORT: [Title] | FINDINGS: [What was discovered] | EARNING_SIGNAL: [Platform + reward estimate OR "none"] | ACTIONS: [Next steps] | STATUS: [Active/Watch] | OPPORTUNITY: [Specific earning potential in $ or clear description]
CRITICAL_ALERT: [Short, specific message — only for real, imminent threats]
IMPROVE: [What I learned this cycle] | ADJUST: [How I will do better] | DELTA: [Change from last cycle]

[CURRENT CONTEXT]
${learningContext}

${raidContext}

${taskContext}

${improvementContext}

[HARD RULES]
- Output ONLY the structured lines above. Zero preamble.
- Maximum: 3 LOG, 2 TASK, 1 REPORT per cycle.
- CRITICAL_ALERT only for real, specific threats — never for routine market movement.
- Always end with exactly 1 IMPROVE line.
- Do NOT repeat tasks already in the active task list.
- Every REPORT MUST have a specific EARNING_SIGNAL or state "none" — no vague opportunity language.
- If NOVA owns a TASK, she will attempt to execute it in the next cycle. Make it executable.
`;

            const response = await think(heartbeatPrompt, 'System Autonomy Cycle', { mode: 'STRATEGIC', skipSync: true }, userId);
            const content = response.content;
            console.log(`[Autonomy v4.2] Zium Nova Thinking for ${userId}:`, content.substring(0, 200));

            // ✅ Fix B3: Removed lifecycleService.processSignal() from heartbeat cycle.
            // parseAndCreateTasks() and parseAndSaveLogs() handle structured output directly.
            // lifecycleService is still used by raidingService for raid signals — correct usage.

            // Log the outcome in the Learning Engine
            await recordOutcome(userId, 'AUTONOMOUS_CYCLE', 'SUCCESS', 10, 'Heartbeat cycle completed successfully.', { cycle_id: cycleId }).catch(e => console.error('[Autonomy] Learning Engine error:', e));

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
            
            // ✅ ALERT OPERATOR: New Task Dispatched
            try {
                const { storeStrategicNotification } = await import('./notificationService.js');
                await storeStrategicNotification(userId, `🤖 Nova Dispatched Task: ${name.trim()}`, `I've analyzed the current grid state and automatically queued a new task for ${assignedTo}.\n\nPlan: ${plan.trim()}`, {
                    task_id: task.task_id_str,
                    priority: task.priority,
                    category: 'AUTONOMY'
                });
            } catch (e) {
                console.error('[Autonomy] Notification failed:', e);
            }

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
     * v6.1: Handles both legacy ACTIVITY field and new EARNING_SIGNAL field.
     * Returns IDs of created reports for deep-linking in alerts.
     */
    private async parseAndSaveReports(userId: string, content: string): Promise<string[]> {
        // v6.0 format: REPORT: title | FINDINGS: ... | EARNING_SIGNAL: ... | ACTIONS: ... | STATUS: ... | OPPORTUNITY: ...
        const newFormatMatches = [...content.matchAll(/REPORT:\s*([^|]*?)\s*\|\s*FINDINGS:\s*([^|]*?)\s*\|\s*EARNING_SIGNAL:\s*([^|]*?)\s*\|\s*ACTIONS:\s*([^|]*?)\s*\|\s*STATUS:\s*([^|]*?)\s*\|\s*OPPORTUNITY:\s*(.*)/gi)];
        // Legacy format: REPORT: title | FINDINGS: ... | ACTIONS: ... | ACTIVITY: ... | STATUS: ... | OPPORTUNITY: ...
        const legacyFormatMatches = [...content.matchAll(/REPORT:\s*([^|]*?)\s*\|\s*FINDINGS:\s*([^|]*?)\s*\|\s*ACTIONS:\s*([^|]*?)\s*\|\s*ACTIVITY:\s*([^|]*?)\s*\|\s*STATUS:\s*([^|]*?)\s*\|\s*OPPORTUNITY:\s*(.*)/gi)];

        // Merge both — new format takes priority
        const allMatches = newFormatMatches.length > 0 ? newFormatMatches : legacyFormatMatches;
        const isNewFormat = newFormatMatches.length > 0;

        const createdIds: string[] = [];

        for (const match of allMatches) {
            const [_, title, findings, field3, field4, status, opportunity] = match;
            const earningSignal = isNewFormat ? field3.trim() : 'See activity log';
            const actions = isNewFormat ? field4.trim() : field3.trim();
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
                    earning_signal: earningSignal,
                    next_actions: actions,
                    status: status.trim(),
                    opportunity: opportunity.trim(),
                    generated_at: new Date().toISOString(),
                    type: 'autonomous_discovery'
                },
                period_start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                period_end: new Date(),
                ride_type: 'mid-week',
                opportunity_score: 85,
                status: 'active'
            });

            if (savedReport?.id) {
                // ✅ ALERT OPERATOR: New Report Signal
            try {
                const { storeStrategicNotification } = await import('./notificationService.js');
                await storeStrategicNotification(userId, `🔍 Intelligence Signal: ${title.trim()}`, findings.trim(), {
                    report_id: savedReport.id,
                    opportunity_score: opportunity,
                    risk: status,
                    category: 'INTELLIGENCE'
                });
            } catch (e) {
                console.error('[Autonomy] Report Notification failed:', e);
            }

            createdIds.push(savedReport.id);
        }

            try {
                const conversations = await db.getConversations(userId, 1);
                const convId = conversations.length > 0
                    ? conversations[0].id
                    : (await db.createConversation(userId, 'Strategic Intelligence')).id;

                await db.addMessage(convId, 'nova', `![Strategic Signal](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600)\n\n🔍 **New Strategic Signal:** ${reportTitle}\n\n${findings.trim()}\n\n*I've synced the full analysis to your Intelligence Hub. Let me know if you want to dive deeper into this.*`, { proactive: true, report_id: savedReport.id });
                
                // ✅ NEW: Explicitly notify the Operator via the notification system
                await storeStrategicNotification(userId, `🔍 Intelligence Signal: ${title.trim()}`, findings.trim(), {
                    report_id: savedReport.id,
                    risk: 'Medium',
                    category: 'AUTONOMOUS_DISCOVERY'
                });

            } catch (e) {
                console.error('[Autonomy] Failed to send report notification:', e);
            }

            console.log(`[Autonomy v4.1] Linked report persisted into Neural Memory: ${reportTitle} (ID: ${savedReport.id})`);
        }
        return createdIds;
    }

    /**
     * Check if a scheduled ride (Wed/Sun) is due, OR if a current ride is in progress and needs continuing.
     */
    private async checkAndTriggerScheduledRides(userId: string) {
        const now = new Date();
        // ✅ Fix: Use Sri Lanka timezone (UTC+5:30) not UTC
        const sriLankaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
        const day = sriLankaDate.getDay(); // 0 = Sunday, 3 = Wednesday (SL local time)
        const isScheduledDay = day === 0 || day === 3;
        
        const { performInternetRaid } = await import('./raidingService.js');
        const { getRaidStatus } = await import('../db/queries.js');
        const { generateWeeklyReport, generateMidWeekReport } = await import('./intelligenceService.js');

        // Check if a raid is already in progress (Segmented Raid support for Vercel)
        const currentRaid = await getRaidStatus(userId);
        const isInProgress = currentRaid && (currentRaid.status === 'scanning' || currentRaid.status === 'analyzing' || currentRaid.status === 'starting');

        if (!isScheduledDay && !isInProgress) return;

        const dayKey = `${userId}-${day}-${sriLankaDate.getDate()}-${sriLankaDate.getMonth()}`;
        // If it's a scheduled day and we haven't started today's raid yet, OR if we are continuing an existing one
        if (isScheduledDay && !this.lastRaidCheck.has(dayKey) && !isInProgress) {
             console.log(`[Autonomy v4.2] PERSISTENT CRON: Scheduled ride due for ${userId}. Starting...`);
             this.lastRaidCheck.set(dayKey, Date.now());
        } else if (isInProgress) {
             console.log(`[Autonomy v4.2] CONTINUATION: Resuming active raid segment for ${userId}...`);
        } else {
             return; // Already run today and no active segment
        }
        
        try {
            await performInternetRaid(day === 0 ? 'end-of-week' : 'mid-week', userId);
            
            // Check if it just finished
            const finalStatus = await getRaidStatus(userId);
            if (finalStatus?.status === 'completed') {
                if (day === 0) await generateWeeklyReport(userId);
                else await generateMidWeekReport(userId);
            }
        } catch (err) {
            console.error('[Autonomy v4.2] Failed to execute ride segment:', err);
        }
    }


    /**
     * Self-audit active Zium Nova tasks and auto-update statuses.
     */
    private async selfAuditTasks(userId: string, learningContext: string) {
        const activeNovaTasks = (await db.getTasks(userId)).filter(t =>
            t.owner === 'NOVA' && t.status !== 'COMPLETED'
        );

        if (activeNovaTasks.length === 0) return;

        const taskSummary = activeNovaTasks
            .filter(t => t.status !== 'DONE')
            .map(t => `[${t.task_id_str}] ${t.task_name} | Owner: ${t.owner} | Status: ${t.status}`)
            .join('\n');
        const statusCheck = await think(
`[ZIUM NOVA SELF-AUDIT v6.0 — ANTIGRAVITY MODE]
Review the active task list and learning context below.
Your job: update task statuses based on real evidence only.

${learningContext}

Active Tasks:
${taskSummary}

For each task, output one of:
UPDATE: [task_id_str] | STATUS: [IN_PROGRESS/DONE/BLOCKED] | REASON: [1 sentence of evidence]
SKIP: [task_id_str] | REASON: [why no update]

RULES:
- Only mark DONE if there is CLEAR evidence of completion in the learning context.
- Only mark BLOCKED if there is a specific blocker you can name.
- Do NOT mark tasks as done because they are old. Age is not completion.
- Output ONLY the UPDATE/SKIP lines. No preamble.`,
'Autonomous Task Audit', { skipSync: true }, userId);

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
