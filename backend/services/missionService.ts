import db from '../db/queries.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage Zium Nova's Weekly Missions and Task Automation.
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
            await db.updateTaskStatus(userId, targetTask.task_id_str, 'COMPLETED', 'Automatically resolved by Zium Nova Protocol.');
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
        // UPDATE: [task name or id] | STATUS: DONE/IN_PROGRESS/BLOCKED/TODO | REASON: [reason]
        const updateMatches = content.matchAll(/UPDATE:\s*([^|]+)\|\s*STATUS:\s*([A-Z_]+)\|\s*REASON:\s*(.*)/gi);
        for (const match of updateMatches) {
            const identifier = match[1].trim();
            const statusRaw = match[2].trim().toUpperCase();
            const reason = match[3].trim();
            
            const status = statusRaw === 'IN_PROGRESS' ? 'PROCESS' : (statusRaw === 'DONE' ? 'COMPLETED' : statusRaw);
            
            const tasks = await db.getTasks(userId);
            const target = tasks.find(t => t.task_id_str === identifier || t.task_name.toLowerCase().includes(identifier.toLowerCase()));
            
            if (target) {
                await db.updateTaskStatus(userId, target.task_id_str, status, `Update: ${reason}`);
                console.log(`[Mission] Structured Update: ${target.task_id_str} -> ${status}`);
            }
        }

        // DELETE: [task name or id] | REASON: [reason]
        const deleteMatches = content.matchAll(/DELETE:\s*([^|]+)\|\s*REASON:\s*(.*)/gi);
        for (const match of deleteMatches) {
            const identifier = match[1].trim();
            const reason = match[2].trim();
            
            const tasks = await db.getTasks(userId);
            const target = tasks.find(t => t.task_id_str === identifier || t.task_name.toLowerCase().includes(identifier.toLowerCase()));
            
            if (target) {
                await db.deleteTask(target.task_id_str, userId);
                console.log(`[Mission] Structured Delete: ${target.task_id_str} | Reason: ${reason}`);
            }
        }

        // 3. Strategic Task Recovery (Fallback: Ask Zium Nova's brain to extract tasks from natural language)
        if (content.length > 20 && !content.includes('TASK_CENTER_UPDATE')) {
            const { think } = await import('./openClawService.js');
                const recoveryPrompt = `[ZIUM NOVA — STRATEGIC TASK RECOVERY]
Extract any actionable tasks or strategic missions mentioned in the following message.
Provide the output in standard Zium Nova TASK format:
TASK: [Name] | PRIORITY: [Low/Medium/High] | OWNER: [NOVA/OPERATOR] | PLAN: [Description]

Message: "${content}"`;

            // We use a light model for recovery to save tokens
            const recoveryResponse = await think(recoveryPrompt, '', { model: 'llama-3.1-8b-instant', skipSync: true }, userId);
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
        const lower = message.toLowerCase();
        
        // Helper to find task by fuzzy name or ID
        const findTask = async (idOrName: string) => {
            const tasks = await db.getTasks(userId);
            return tasks.find(t => 
                t.task_id_str.toLowerCase() === idOrName.toLowerCase() || 
                t.task_name.toLowerCase().includes(idOrName.toLowerCase())
            );
        };

        // 1. Deletion Intent: "delete that task" / "remove that task"
        if (lower.includes('delete that task') || lower.includes('remove that task') || lower.includes('delete task') || lower.includes('remove task')) {
            const match = message.match(/(?:delete|remove)(?:\s+that)?\s+task\s+([a-zA-Z0-9-_\s]+)/i);
            const identifier = match ? match[1].trim() : (lower.includes('that') ? 'last' : ''); // 'last' logic could be added if needed
            
            if (identifier) {
                const target = await findTask(identifier);
                if (target) {
                    await db.deleteTask(target.task_id_str, userId);
                    console.log(`[Mission] Intent: Deleted task ${target.task_id_str}`);
                }
            }
        }

        // 2. Status Updates: DONE / COMPLETED
        if (lower.includes('mark as done') || lower.includes('complete') || lower.includes('finished')) {
            const match = message.match(/(?:mark\s+)?(?:as\s+)?(?:done|complete|finished)(?:\s+that)?\s+task\s+([a-zA-Z0-9-_\s]+)/i) || 
                          message.match(/task\s+([a-zA-Z0-9-_\s]+)\s+(?:is\s+)?(?:done|complete|finished)/i);
            if (match) {
                const target = await findTask(match[1].trim());
                if (target) {
                    await db.updateTaskStatus(userId, target.task_id_str, 'COMPLETED', 'Marked as DONE by Operator intent.');
                }
            }
        }

        // 3. Status Updates: IN_PROGRESS
        if (lower.includes('mark as in progress') || lower.includes('start that') || lower.includes('process task')) {
            const match = message.match(/(?:mark\s+as\s+in\s+progress|start\s+that|process)\s+task\s+([a-zA-Z0-9-_\s]+)/i);
            if (match) {
                const target = await findTask(match[1].trim());
                if (target) {
                    await db.updateTaskStatus(userId, target.task_id_str, 'PROCESS', 'Marked as IN_PROGRESS by Operator intent.');
                }
            }
        }

        // 4. Status Updates: BLOCKED
        if (lower.includes('mark as blocked')) {
            const match = message.match(/mark(?:\s+task\s+([a-zA-Z0-9-_\s]+))?\s+as\s+blocked/i);
            if (match) {
                const target = await findTask(match[1].trim());
                if (target) {
                    await db.updateTaskStatus(userId, target.task_id_str, 'BLOCKED', 'Marked as BLOCKED by Operator intent.');
                }
            }
        }

        // 5. Clear Intent
        if (lower.includes('clear all tasks') || lower.includes('delete all tasks') || lower.includes('reset mission board')) {
            await db.deleteAllTasks(userId);
            console.log(`[Mission] Intent: Cleared all tasks for ${userId}`);
        }

        // 6. Simple Addition Intent
        if (lower.includes('add task') || lower.includes('assign task')) {
            const match = message.match(/(?:add|assign) task\s+"?(.+?)"?(?:\s+to\s+([a-zA-Z\s_]+))?$/i);
            if (match) {
                const name = match[1].trim();
                const ownerRaw = (match[2] || 'OPERATOR').trim().toUpperCase();
                const owner = ownerRaw.includes('NOVA') ? 'NOVA' : 'OPERATOR';
                
                await db.createTask(userId, {
                    task_name: name,
                    owner: owner as any,
                    priority: 'MEDIUM',
                    status: 'TODO',
                    action_plan: 'Created via direct Operator intent.'
                }, `T-${uuidv4().slice(0, 8)}`);
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
