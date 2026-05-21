import { v4 as uuidv4 } from 'uuid';
import db from '../db/queries.js';
import { TaskOwner, TaskDuration, TaskPriority } from '../types/index.js';
import { eventService, KaruppuEvent } from './eventService.js';

export const taskService = {
    /**
     * Create a task with hybrid duration logic.
     * UI: SHORT/MEDIUM/LONG
     * DB: Stores as enum, but logic uses ranges.
     */
    async createTask(userId: string, data: {
        task_name: string;
        owner: TaskOwner;
        priority?: TaskPriority;
        duration?: TaskDuration;
        action_plan?: string;
        notes?: string;
    }) {
        const priority = data.priority || 'MEDIUM';
        const duration = data.duration || 'MEDIUM';
        const owner = data.owner || 'Karuppu';
        
        // Calculate dynamic deadline based on duration
        let deadline = new Date();
        if (duration === 'SHORT') {
            deadline.setHours(deadline.getHours() + 2); // 2 hours
        } else if (duration === 'MEDIUM') {
            deadline.setDate(deadline.getDate() + 3);   // 3 days
        } else if (duration === 'LONG') {
            deadline.setDate(deadline.getDate() + 7);   // 7 days
        }

        const taskIdStr = `T-${uuidv4().slice(0, 8)}`;

        return await db.createTask(userId, {
            task_name: data.task_name,
            owner,
            priority,
            duration,
            action_plan: data.action_plan || '',
            notes: data.notes || '',
            status: 'TODO',
            deadline
        }, taskIdStr);
    },

    /**
     * Strategic Weekly Objective Setup.
     * Sunday 02:00 AM SL Time.
     */
    /*
    DEPRECATED: Use missionService.generateWeeklyTasks() for unified mission generation.
    async initializeWeeklyObjectives(userId: string) {
        ...
    }
    */
};
