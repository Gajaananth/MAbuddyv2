import cron from 'node-cron';
import db from '../db/queries.js';
import { getAllUsers } from '../db/authQueries.js';
import { think } from './openClawService.js';

export const monitorService = {
    /**
     * Start the 12-hour task monitoring loop.
     * Sri Lanka Time (GMT +5:30).
     */
    initMonitor() {
        console.log('[Monitor] Task Audit System ARMED (12-hour cycle).');
        
        // Every 12 hours
        cron.schedule('0 */12 * * *', async () => {
            await this.auditAllTasks();
        }, { timezone: "Asia/Colombo" });
    },

    /**
     * Audit tasks for all users.
     */
    async auditAllTasks() {
        try {
            const users = await getAllUsers();
            for (const user of users) {
                await this.auditUserTasks(user.id);
            }
        } catch (e) {
            console.error('[Monitor] Audit Failure:', e);
        }
    },

    /**
     * Check for overdue or stuck tasks for a specific user.
     */
    async auditUserTasks(userId: string) {
        const tasks = await db.getTasks(userId);
        const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'DONE');
        
        if (overdue.length > 0) {
            console.log(`[Monitor] Found ${overdue.length} overdue tasks for user ${userId}`);
            
            // Create a briefing message for the operator
            const overdueNames = overdue.map(t => t.task_name).join(', ');
            const auditMessage = `[STRATEGIC ALERT] Operation delays detected in: ${overdueNames}. Buddy, should we re-prioritize these?`;
            
            // Log it as an intelligence outcome
            await db.saveIntelligenceLog(userId, 'TASK_MONITOR', auditMessage, 'MONITOR_SERVICE');
            
            // Notify Nova to mention it in the next chat interaction (via memory)
            await db.saveMessage({
                conversation_id: (await db.getConversations(userId))[0]?.id, // Post to latest conversation
                role: 'nova',
                content: auditMessage,
                metadata: { action_type: 'TASK_ALERT', flags: ['OVERDUE'] }
            } as any);
        }
    }
};
