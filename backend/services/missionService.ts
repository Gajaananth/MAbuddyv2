import * as db from '../db/queries.js';
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

    private getWeekNumber(d: Date): number {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
}

export const missionService = new MissionService();
