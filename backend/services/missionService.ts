import db from '../db/queries.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage Karuppu's Weekly Missions and Task Automation.
 */
export class MissionService {
    /**
     * Generate the mandatory 5 tasks for the current week if they don't exist.
     * WEEK format: W{WeekNumber}-{Year} (e.g., W12-2026)
     */
    async generateWeeklyTasks(userId: string) {
        const now = new Date();
        const weekNumber = this.getWeekNumber(now);
        const year = now.getFullYear();
        const weekId = `W${weekNumber}-${year.toString().slice(-2)}`;

        // Check if tasks for this week already exist
        const existingTasks = await db.getTasks(userId);
        const thisWeekTasks = existingTasks.filter(t => t.task_id_str.startsWith(weekId));

        if (thisWeekTasks.length > 0) {
            console.log(`[Mission] Tasks for ${weekId} already exist for user ${userId}.`);
            return;
        }

        console.log(`[Mission] Generating mandatory tasks for ${weekId}...`);

        const mandatoryTasks = [
            { 
                id: '01', 
                name: 'Scout the latest AI signals', 
                owner: 'NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Scan the internet grid. 2. Filter out the noise/scams. 3. Find some real winning moves.',
                notes: "I'll handle the heavy lifting here, Operator." 
            },
            { 
                id: '02', 
                name: 'Look over the Intel Hub', 
                owner: 'OPERATOR', 
                priority: 'MEDIUM', 
                action_plan: '1. Jump into the Intelligence Dashboard. 2. Check out the 5 freshest logs. 3. Let me know which ones we are chasing.',
                notes: 'Need your eyes on this, Partner.' 
            },
            { 
                id: '03', 
                name: 'Dig into new earning loops', 
                owner: 'NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Study how agents are actually making bank. 2. Verify the legit ones. 3. Write it up for us.',
                notes: "Hunting for our next move." 
            },
            { 
                id: '04', 
                name: 'Verify our active protocols', 
                owner: 'OPERATOR', 
                priority: 'HIGH', 
                action_plan: '1. Check the wallet and earning status. 2. Confirm everything is running smooth. 3. Drop a quick note in chat.',
                notes: "Let's make sure the bags are safe." 
            },
            { 
                id: '05', 
                name: 'Self-Improvement Sync', 
                owner: 'NOVA', 
                priority: 'MEDIUM', 
                action_plan: '1. Log my new insights. 2. Tighten up my task logic. 3. Get ready for the next level.',
                notes: 'Always getting smarter for the team.' 
            }
        ];

        for (const task of mandatoryTasks) {
            const taskIdStr = `W${weekNumber}-${year.toString().slice(-2)}-${task.id}`;
            try {
                await db.createTask(userId, {
                    task_name: task.name,
                    owner: task.owner as any,
                    priority: task.priority as any,
                    action_plan: task.action_plan,
                    notes: task.notes
                }, taskIdStr);
            } catch (err: any) {
                if (err.code === '23505') { // PostgreSQL Unique Violation
                    console.log(`[Mission] Task ${taskIdStr} already exists. Skipping.`);
                } else {
                    console.error(`[Mission] Failed to create task ${taskIdStr}:`, err.message);
                }
            }
        }

        console.log(`[Mission] Successfully initialized ${weekId} mission board.`);
    }

    /**
     * Automatically mark a specific mission task as completed.
     */
    async completeZiumTask(userId: string, taskPrefix: string) {
        const now = new Date();
        const weekNumber = this.getWeekNumber(now);
        const year = now.getFullYear();
        const weekId = `W${weekNumber}-${year.toString().slice(-2)}`;
        
        const tasks = await db.getTasks(userId);
        const targetTask = tasks.find(t => 
            t.task_id_str.startsWith(weekId) && 
            t.task_name.toLowerCase().includes(taskPrefix.toLowerCase()) &&
            t.status !== 'COMPLETED'
        );

        if (targetTask) {
            await db.updateTaskStatus(userId, targetTask.task_id_str, 'COMPLETED', 'Automatically resolved by Karuppu Protocol.');
            console.log(`[Mission] Auto-completed task: ${targetTask.task_id_str}`);
        }
    }

    /**
     * Parse tasks from a chat response (TASK_CENTER_UPDATE or TASK: blocks) and save them to the DB.
     */
    async parseAndSaveTasksFromChat(userId: string, content: string) {
        // 1. Improved JSON extraction: Look for TASK_CENTER_UPDATE or any JSON code block that looks like a task list
        const jsonBlocks = content.match(/({[\s\S]*?})|```json\s*({[\s\S]*?})\s*```/gi);
        
        if (jsonBlocks) {
            for (const block of jsonBlocks) {
                try {
                    // Clean the block if it's wrapped in markdown
                    const cleanJson = block.replace(/```json|```/gi, '').trim();
                    const data = JSON.parse(cleanJson);
                    
                    // Support various keys: tasks, dashboard, task_list, etc.
                    const taskArray = data.tasks || data.dashboard || data.task_list;
                    
                    if (taskArray && Array.isArray(taskArray)) {
                        console.log(`[Mission] Flexible Parser: Detected ${taskArray.length} tasks for ${userId}...`);
                        
                        for (const item of taskArray) {
                            // Extract properties with fallbacks for different AI naming conventions
                            const name = item.name || item.description || item.task_name || item.topic || "Unnamed Strategic Task";
                            const rawOwner = (item.owner || item.assigned_to || item.assignee || item.assigned || "OPERATOR").toString().toUpperCase();
                            const owner = rawOwner.includes('NOVA') ? 'NOVA' : 'OPERATOR';
                            const priority = (item.priority || item.risk || 'MEDIUM').toString().toUpperCase();
                            const status = (item.status || 'TODO').toString().toUpperCase();
                            const plan = item.action_plan || item.plan || item.tracking || item.description || "";
                            
                            const taskIdStr = item.id || `T-${uuidv4().slice(0, 8)}`;
                            
                            await db.createTask(userId, {
                                task_name: name.slice(0, 100),
                                owner: owner as any,
                                priority: (priority === 'PENDING' ? 'MEDIUM' : priority) as any,
                                status: (status === 'PENDING' ? 'TODO' : status) as any,
                                action_plan: plan,
                                notes: `Synchronized from AI Strategic Plan: ${data.project || 'General'}`
                            }, taskIdStr);
                        }
                    }
                } catch (e) {
                    // Silently ignore non-task JSON
                }
            }
        }

        // 2. Structured Commands (Autonomous & Explicit)
        
        // Helper to clean identifiers (removes trailing dots/ellipsis for better fuzzy matching)
        const cleanId = (id: string) => id.replace(/\.+$/, '').trim();

        // TASK: [name] | PRIORITY: [prio] | OWNER: [owner] | PLAN: [plan]
        const taskMatches = content.matchAll(/TASK:\s*([^|\n]+)\s*\|\s*PRIORITY:\s*([^|\n]+)\s*\|\s*OWNER:\s*([^|\n]+)\s*\|\s*PLAN:\s*(.*?)(?=\n\s*TASK:|\n\s*UPDATE:|\n\s*DELETE:|$)/gi);
        for (const match of taskMatches) {
            const name = match[1].trim();
            const priority = match[2].trim().toUpperCase() as any;
            const ownerRaw = match[3].trim().toUpperCase();
            const owner = ownerRaw.includes('NOVA') ? 'NOVA' : 'OPERATOR';
            const plan = match[4].trim();

            if (name) {
                console.log(`[Mission] Auto-creating task: ${name}`);
                await db.createTask(userId, {
                    task_name: name.slice(0, 100),
                    owner: owner as any,
                    priority: (['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : 'MEDIUM') as any,
                    status: 'TODO',
                    action_plan: plan,
                    notes: `Autonomous sync from Karuppu.`
                }, `T-${uuidv4().slice(0, 8)}`);
            }
        }

        // UPDATE: [task name or id] | STATUS: DONE/PROCESS/BLOCKED/TODO (| REASON: [reason])
        const updateMatches = content.matchAll(/UPDATE:\s*([^|\n]+)\s*\|\s*STATUS:\s*([^|\n]+)(?:\s*\|\s*REASON:\s*(.*?))?(?=\n\s*TASK:|\n\s*UPDATE:|\n\s*DELETE:|$)/gi);
        for (const match of updateMatches) {
            const identifier = cleanId(match[1]);
            const statusRaw = match[2].trim().toUpperCase().split(/[\s,.-]+/)[0];
            const reason = (match[3] || 'Autonomous update').trim();
            
            // Canonical Status Mapping
            let status = 'TODO';
            if (['DONE', 'COMPLETED', 'FINISHED', 'COMPLETE'].includes(statusRaw)) status = 'COMPLETED';
            if (['PROCESS', 'IN_PROGRESS', 'IN-PROGRESS', 'PROGRESS', 'STARTING', 'START'].includes(statusRaw)) status = 'PROCESS';
            if (['BLOCKED', 'STUCK'].includes(statusRaw)) status = 'BLOCKED';
            if (['TODO', 'PENDING'].includes(statusRaw)) status = 'TODO';
            
            const tasks = await db.getTasks(userId);
            const target = tasks.find(t => t.task_id_str === identifier || t.task_id_str === `T-${identifier}` || t.task_name.toLowerCase().includes(identifier.toLowerCase()));
            
            if (target) {
                await db.updateTaskStatus(userId, target.task_id_str, status, `Update: ${reason}`);
                console.log(`[Mission] Structured Update: ${target.task_id_str} -> ${status}`);
            }
        }

        // DELETE: [task name or id] (| REASON: [reason])
        const deleteMatches = content.matchAll(/DELETE:\s*([^|\n]+)(?:\s*\|\s*REASON:\s*(.*?))?(?=\n\s*TASK:|\n\s*UPDATE:|\n\s*DELETE:|$)/gi);
        for (const match of deleteMatches) {
            const identifier = cleanId(match[1]);
            const reason = (match[2] || 'Operator/AI request').trim();
            
            const tasks = await db.getTasks(userId);
            const target = tasks.find(t => t.task_id_str === identifier || t.task_id_str === `T-${identifier}` || t.task_name.toLowerCase().includes(identifier.toLowerCase()));
            
            if (target) {
                await db.deleteTask(target.task_id_str, userId);
                console.log(`[Mission] Structured Delete: ${target.task_id_str} | Reason: ${reason}`);
            }
        }

        // 3. Strategic Task Recovery (Fallback: Ask Karuppu's brain to extract tasks from natural language)
        if (content.length > 20 && !content.includes('TASK_CENTER_UPDATE')) {
            const { think } = await import('./openClawService.js');
                const recoveryPrompt = `[Karuppu — STRATEGIC TASK RECOVERY]
Extract any actionable tasks or strategic missions mentioned in the following message.
Provide the output in standard Karuppu TASK format:
TASK: [Name] | PRIORITY: [Low/Medium/High] | OWNER: [NOVA/OPERATOR] | PLAN: [Description]

Message: "${content}"`;

            // We use a light model for recovery to save tokens
            const recoveryResponse = await think(recoveryPrompt, [], { model: 'llama-3.1-8b-instant', skipSync: true }, userId);
            const recoveredContent = recoveryResponse.content;

            const recoveredMatches = recoveredContent.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*OWNER:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
            for (const match of recoveredMatches) {
                const [ , name, priority, ownerRaw, plan ] = match;
                const taskIdStr = `T-${uuidv4().slice(0, 8)}`;
                try {
                    const { lifecycleService } = await import('./lifecycleService.js');
                    await lifecycleService.processSignal(userId, {
                        category: 'RECOVERED_SIGNAL',
                        source: 'BRAIN_RECOVERY',
                        content: `Recovered Task: ${name.trim()} | Plan: ${plan.trim()}`,
                        metadata: { recovered_name: name.trim() }
                    });
                    console.log(`[Mission] Recovered task processed through lifecycle: ${name.trim()}`);
                } catch (err: any) {
                    console.error('[Mission] Failed to create recovered task:', err.message);
                }
            }
        }
    }

    /**
     * Process direct intent for tasks from a message.
     */
    async processTaskIntent(userId: string, message: string) {
        const cleanMsg = message.toLowerCase().trim();

        // 1. Determine the core action from the message keywords
        let action: 'DELETE' | 'COMPLETED' | 'PROCESS' | 'BLOCKED' | 'TODO' | null = null;
        if (cleanMsg.includes('delete') || cleanMsg.includes('remove') || cleanMsg.includes('purge') || cleanMsg.includes('erase') || cleanMsg.includes('discard') || cleanMsg.includes('kill') || cleanMsg.includes('trash')) {
            action = 'DELETE';
        } else if (cleanMsg.includes('complete') || cleanMsg.includes('done') || cleanMsg.includes('finished') || cleanMsg.includes('resolve') || cleanMsg.includes('close')) {
            action = 'COMPLETED';
        } else if (cleanMsg.includes('block') || cleanMsg.includes('stuck') || cleanMsg.includes('hold') || cleanMsg.includes('pause')) {
            action = 'BLOCKED';
        } else if (cleanMsg.includes('progress') || cleanMsg.includes('process') || cleanMsg.includes('start') || cleanMsg.includes('run') || cleanMsg.includes('running')) {
            action = 'PROCESS';
        } else if (cleanMsg.includes('todo') || cleanMsg.includes('to-do') || cleanMsg.includes('pending') || cleanMsg.includes('reset') || cleanMsg.includes('reopen') || cleanMsg.includes('open')) {
            action = 'TODO';
        }

        // Fetch all active tasks
        const tasks = await db.getTasks(userId);

        // 2. Handle global actions (e.g. clear all, delete your tasks)
        if (cleanMsg.includes('clear all tasks') || cleanMsg.includes('delete all tasks') || cleanMsg.includes('reset mission board') || cleanMsg.includes('purge all tasks')) {
            await db.deleteAllTasks(userId);
            console.log(`[Mission] Intent: Cleared all tasks for ${userId}`);
            return;
        }

        if (action === 'DELETE' && (cleanMsg.includes('delete all tasks not for me') || cleanMsg.includes('delete your tasks') || cleanMsg.includes('clear your tasks') || cleanMsg.includes('remove your tasks'))) {
            const toDelete = tasks.filter(t => t.owner === 'NOVA');
            for (const t of toDelete) {
                await db.deleteTask(t.task_id_str, userId);
            }
            console.log(`[Mission] Intent: Cleared all AI tasks.`);
            return;
        }

        // 3. Handle Add Intent
        if (cleanMsg.includes('add task') || cleanMsg.includes('assign task') || cleanMsg.includes('create task') || cleanMsg.includes('new task')) {
            const addMatch = message.match(/(?:add|assign|create|new) task\s+"?(.+?)"?(?:\s+to\s+([a-zA-Z\s_]+))?$/i);
            if (addMatch) {
                const name = addMatch[1].trim();
                const ownerRaw = (addMatch[2] || 'OPERATOR').trim().toUpperCase();
                const owner = ownerRaw.includes('NOVA') ? 'NOVA' : 'OPERATOR';
                
                await db.createTask(userId, {
                    task_name: name,
                    owner: owner as any,
                    priority: 'MEDIUM',
                    status: 'TODO',
                    action_plan: 'Created via direct Operator intent.'
                }, `T-${uuidv4().slice(0, 8)}`);
                console.log(`[Mission] Intent: Created task "${name}" assigned to ${owner}`);
                return;
            }
        }

        // 4. Perform fuzzy matching to find the targeted task
        if (action && tasks.length > 0) {
            let bestTask: any = null;
            let bestScore = 0;

            for (const t of tasks) {
                let score = 0;
                const taskId = t.task_id_str.toLowerCase();
                const taskName = t.task_name.toLowerCase();

                // Scenario A: Direct ID Match (highest priority)
                if (cleanMsg.includes(taskId)) {
                    score = Math.max(score, 100);
                }

                // Scenario B: Numeric suffix match (e.g. '03' or '3' for W12-26-03)
                const idParts = taskId.split('-');
                const numericSuffix = idParts[idParts.length - 1];
                if (numericSuffix && /^\d+$/.test(numericSuffix)) {
                    const numericVal = parseInt(numericSuffix, 10);
                    // Match word boundary for matching number format: e.g. "03" or "3"
                    const regexNum = new RegExp(`\\b0*${numericVal}\\b`);
                    if (regexNum.test(cleanMsg)) {
                        score = Math.max(score, 95);
                    }
                }

                // Scenario C: Exact name match
                if (cleanMsg.includes(taskName)) {
                    score = Math.max(score, 80);
                }

                // Scenario D: Distinct keyword substring match
                const stopWords = new Set([
                    'the', 'and', 'for', 'our', 'new', 'latest', 'with', 'into', 'this', 
                    'that', 'your', 'about', 'from', 'task', 'mission', 'board', 'grid',
                    'delete', 'remove', 'mark', 'complete', 'done', 'process', 'todo', 'block'
                ]);
                const nameTokens = taskName.split(/[\s,._\-()]+/).filter(w => w.length >= 3 && !stopWords.has(w));
                
                if (nameTokens.length > 0) {
                    let matchedTokens = 0;
                    for (const token of nameTokens) {
                        const regexToken = new RegExp(`\\b${token}\\b`);
                        if (regexToken.test(cleanMsg) || cleanMsg.includes(token)) {
                            matchedTokens++;
                        }
                    }
                    if (matchedTokens > 0) {
                        const matchRatio = matchedTokens / nameTokens.length;
                        const keywordScore = 40 + Math.round(matchRatio * 35);
                        score = Math.max(score, keywordScore);
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestTask = t;
                }
            }

            // If a task is matched with high confidence, execute the action
            if (bestTask && bestScore >= 15) {
                if (action === 'DELETE') {
                    await db.deleteTask(bestTask.task_id_str, userId);
                    console.log(`[Mission] Intent Match: Deleted task "${bestTask.task_name}" (${bestTask.task_id_str}) with confidence score ${bestScore}`);
                } else {
                    const statusReason = `Marked as ${action} via Operator natural language intent.`;
                    await db.updateTaskStatus(userId, bestTask.task_id_str, action, statusReason);
                    console.log(`[Mission] Intent Match: Updated task "${bestTask.task_name}" (${bestTask.task_id_str}) to status ${action} with confidence score ${bestScore}`);
                }
            }
        }
    }

    private getWeekNumber(d: Date): number {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
}

export const missionService = new MissionService();
