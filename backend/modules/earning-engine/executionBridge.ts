import db from '../../db/connection.js';
import { ScoredTask } from './types.js';

/**
 * Execution Bridge
 * Does NOT execute tasks directly.
 * Passes validated tasks into the existing ACTION layer (Command Center Tasks).
 */
export async function dispatchToCommandCenter(userId: string, scoredTask: ScoredTask): Promise<void> {
    if (!scoredTask.id || !scoredTask.platform) {
        throw new Error('[Earning Engine] Task missing required fields for dispatch.');
    }

    // Assign priority based on final_score
    let priority = 'MEDIUM';
    if (scoredTask.final_score > 80) priority = 'HIGH';
    else if (scoredTask.final_score > 60) priority = 'HIGH';
    else if (scoredTask.final_score < 30) priority = 'LOW';

    // Map duration
    let duration = 'MEDIUM';
    if (scoredTask.estimated_time < 10) duration = 'SHORT';
    else if (scoredTask.estimated_time > 60) duration = 'LONG';

    const taskIdStr = `EE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const actionPlan = `Execute earning opportunity on ${scoredTask.platform}.\nURL: ${scoredTask.url}\nExpected Reward: ${scoredTask.reward}\nScore: ${scoredTask.final_score}`;

    try {
        const poolInstance = db.getPool();
        if (!poolInstance) throw new Error('[DB] Grid Offline: Pool not initialized');
        const client = await poolInstance.connect();
        try {
            // 1. Inject into existing Command Center Task system
            await client.query(
                `INSERT INTO tasks (user_id, task_id_str, task_name, owner, status, priority, duration, action_plan, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    userId, 
                    taskIdStr, 
                    `[Earning] ${scoredTask.type} on ${scoredTask.platform}`, 
                    'Karuppu', // Owned by Karuppu for autonomous execution
                    'TODO', 
                    priority, 
                    duration, 
                    actionPlan,
                    JSON.stringify(scoredTask.metadata)
                ]
            );

            // 2. Log to new Earnings Tracking System
            await client.query(
                `INSERT INTO earnings_log (user_id, task_id, platform, reward, execution_time, status, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    userId,
                    taskIdStr,
                    scoredTask.platform,
                    scoredTask.reward,
                    scoredTask.estimated_time,
                    'pending',
                    JSON.stringify({ external_id: scoredTask.id, url: scoredTask.url })
                ]
            );

            console.log(`[Earning Engine] Task dispatched to Command Center: ${taskIdStr}`);
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('[Earning Engine] Failed to dispatch task:', e);
        throw e;
    }
}
