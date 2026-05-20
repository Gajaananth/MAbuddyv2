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
            await db.saveIntelligenceLog(userId, {
                category: 'TASK_MONITOR',
                lesson: auditMessage,
                source_context: 'MONITOR_SERVICE'
            });
            
            // Notify Karuppu to mention it in the next chat interaction (via memory)
            const latestConv = (await db.getConversations(userId))[0];
            if (latestConv) {
                await db.addMessage(
                    latestConv.id,
                    'nova',
                    auditMessage,
                    { action_type: 'TASK_ALERT', flags: ['OVERDUE'] }
                );
            }
        }
    }
};
