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
                assigned: 'ZIUM NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Scan the internet grid. 2. Filter out the noise/scams. 3. Find some real winning moves.',
                notes: "I'll handle the heavy lifting here, Buddy." 
            },
            { 
                id: '02', 
                name: 'Look over the Intel Hub', 
                assigned: 'BUDDY', 
                priority: 'MEDIUM', 
                action_plan: '1. Jump into the Intelligence Dashboard. 2. Check out the 5 freshest logs. 3. Let me know which ones we are chasing.',
                notes: 'Need your eyes on this, Partner.' 
            },
            { 
                id: '03', 
                name: 'Dig into new earning loops', 
                assigned: 'ZIUM NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Study how agents are actually making bank. 2. Verify the legit ones. 3. Write it up for us.',
                notes: "Hunting for our next move." 
            },
            { 
                id: '04', 
                name: 'Verify our active protocols', 
                assigned: 'BUDDY', 
                priority: 'HIGH', 
                action_plan: '1. Check the wallet and earning status. 2. Confirm everything is running smooth. 3. Drop a quick note in chat.',
                notes: "Let's make sure the bags are safe." 
            },
            { 
                id: '05', 
                name: 'Self-Improvement Sync', 
                assigned: 'ZIUM NOVA', 
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
                    assigned_to: task.assigned,
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
                            const assignee = (item.assigned_to || item.assignee || item.assigned || "BUDDY").toString().toUpperCase().includes('OPERATOR') ? 'BUDDY' : 'ZIUM NOVA';
                            const priority = (item.priority || item.risk || 'MEDIUM').toString().toUpperCase();
                            const status = (item.status || 'TODO').toString().toUpperCase();
                            const plan = item.action_plan || item.plan || item.tracking || item.description || "";
                            
                            const taskIdStr = item.id || `T-${uuidv4().slice(0, 8)}`;
                            
                            await db.createTask(userId, {
                                task_name: name.slice(0, 100),
                                assigned_to: assignee,
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

        // 2. Fallback: Check for TASK: [Name] | PRIORITY: ...
        const taskMatches = content.matchAll(/TASK:\s*([^|]*?)\s*\|\s*PRIORITY:\s*([^|]*?)\s*\|\s*ASSIGNED:\s*([^|]*?)\s*\|\s*PLAN:\s*(.*)/gi);
        for (const match of taskMatches) {
            const [ , name, priority, assigned, plan ] = match;
            const taskIdStr = `T-${uuidv4().slice(0, 8)}`;
            try {
                await db.createTask(userId, {
                    task_name: name.trim(),
                    assigned_to: assigned.trim().toUpperCase(),
                    priority: priority.trim().toUpperCase() as any,
                    action_plan: plan.trim(),
                    status: 'TODO'
                }, taskIdStr);
                console.log(`[Mission] Created task from chat: ${name.trim()}`);
            } catch (err: any) {
                console.error('[Mission] Failed to create chat task:', err.message);
            }
        }
    }

    /**
     * Process direct intent for tasks from a message.
     */
    async processTaskIntent(userId: string, message: string) {
        const lower = message.toLowerCase();
        
        // 1. Deletion Intent
        if (lower.includes('delete task') || lower.includes('remove task')) {
            const match = message.match(/(?:delete|remove) task\s+([a-zA-Z0-9-_\s]+)/i);
            if (match) {
                const identifier = match[1].trim();
                // Try deleting by task_id_str first, then by name
                const tasks = await db.getTasks(userId);
                const target = tasks.find(t => t.task_id_str === identifier || t.task_name.toLowerCase().includes(identifier.toLowerCase()));
                if (target) {
                    await db.deleteTask(target.task_id_str, userId);
                    console.log(`[Mission] Intent: Deleted task ${target.task_id_str}`);
                }
            }
        }

        // 2. Clear Intent
        if (lower.includes('clear all tasks') || lower.includes('delete all tasks') || lower.includes('reset mission board')) {
            await db.deleteAllTasks(userId);
            console.log(`[Mission] Intent: Cleared all tasks for ${userId}`);
        }

        // 3. Simple Addition Intent (Natural Language)
        if (lower.includes('add task') || lower.includes('assign task')) {
            const match = message.match(/(?:add|assign) task\s+"?(.+?)"?(?:\s+to\s+([a-zA-Z\s_]+))?$/i);
            if (match) {
                const name = match[1].trim();
                const assigneeRaw = (match[2] || 'BUDDY').trim().toUpperCase();
                const assigned_to = assigneeRaw.includes('NOVA') ? 'ZIUM NOVA' : 'BUDDY';
                
                await db.createTask(userId, {
                    task_name: name,
                    assigned_to,
                    priority: 'MEDIUM',
                    status: 'TODO',
                    action_plan: 'Created via direct Operator intent.'
                }, `T-${uuidv4().slice(0, 8)}`);
                console.log(`[Mission] Intent: Added task "${name}" for ${assigned_to}`);
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
