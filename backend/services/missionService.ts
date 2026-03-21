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
                name: 'Scout emerging AI ecosystems', 
                assigned: 'ZIUM NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Execute internet ride. 2. Detect value-creation signals. 3. Filter scams. 4. Prepare activation steps.',
                notes: 'Primary autonomous mission' 
            },
            { 
                id: '02', 
                name: 'Grid Intelligence Review', 
                assigned: 'BUDDY', 
                priority: 'MEDIUM', 
                action_plan: '1. Access the Intelligence Dashboard. 2. Review the latest 5 signal logs. 3. Confirm target opportunities for the week.',
                notes: 'Operator confirmation required' 
            },
            { 
                id: '03', 
                name: 'Autonomous market study', 
                assigned: 'ZIUM NOVA', 
                priority: 'HIGH', 
                action_plan: '1. Study AI-to-AI commerce models. 2. Verify legitimate earning loops. 3. Document strategic insights.',
                notes: 'Value-led market study' 
            },
            { 
                id: '04', 
                name: 'Strategic Financial Activation', 
                assigned: 'BUDDY', 
                priority: 'HIGH', 
                action_plan: '1. Verify cryptographic wallet status. 2. Activate identified low-risk earning protocols. 3. Log results in chat.',
                notes: 'Manual financial oversight' 
            },
            { 
                id: '05', 
                name: 'Continuous knowledge update', 
                assigned: 'ZIUM NOVA', 
                priority: 'MEDIUM', 
                action_plan: '1. Log new discoveries. 2. Refine task generation logic. 3. Prepare autonomous strategic summary.',
                notes: 'Self-improving intelligence' 
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
