import db from './connection.js';
// ──────────────────────────── Conversations ────────────────────────────
export async function getConversationDetail(conversationId, userId) {
    const conv = await getConversationById(conversationId, userId);
    if (!conv)
        return null;
    const messages = await getMessages(conversationId);
    return {
        ...conv,
        messages
    };
}
export async function createConversation(userId, title = 'New Conversation') {
    const result = await db.pool.query('INSERT INTO conversations (title, user_id) VALUES ($1, $2) RETURNING *', [title, userId]);
    return result.rows[0];
}
export async function getConversations(userId, limit = 20, offset = 0, includeDeleted = false) {
    const deletedFilter = includeDeleted ? '' : 'AND is_deleted = FALSE';
    const result = await db.pool.query(`SELECT * FROM conversations WHERE user_id = $1 ${deletedFilter} ORDER BY updated_at DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]);
    return result.rows;
}
export async function getConversationById(id, userId) {
    const result = await db.pool.query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
}
export async function updateConversationTitle(id, userId, title) {
    await db.pool.query('UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [title, id, userId]);
}
export async function updateConversationTopic(id, userId, topicTag) {
    await db.pool.query('UPDATE conversations SET topic_tag = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [topicTag, id, userId]);
}
export async function deleteConversation(id, userId, permanent = false) {
    if (permanent) {
        await db.pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    }
    else {
        await db.pool.query('UPDATE conversations SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId]);
    }
}
export async function searchConversations(userId, query, limit = 20) {
    const searchTerm = `%${query}%`;
    const result = await db.pool.query('SELECT * FROM conversations WHERE user_id = $1 AND (title ILIKE $2 OR topic_tag ILIKE $2) AND is_deleted = FALSE ORDER BY updated_at DESC LIMIT $3', [userId, searchTerm, limit]);
    return result.rows;
}
// ──────────────────────────── Messages ────────────────────────────
export async function addMessage(conversationId, role, content, metadata = null) {
    const isRead = role === 'user'; // User messages are read by default
    const result = await db.pool.query('INSERT INTO messages (conversation_id, role, content, metadata, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING *', [conversationId, role, content, metadata, isRead]);
    await db.pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    return result.rows[0];
}
export async function getUnreadMessageCount(userId) {
    const result = await db.pool.query('SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1 AND m.role = \'nova\' AND m.is_read = FALSE', [userId]);
    return parseInt(result.rows[0].count, 10);
}
export async function markMessagesRead(conversationId, userId) {
    if (userId) {
        await db.pool.query(
            `UPDATE messages m 
             SET is_read = TRUE 
             FROM conversations c 
             WHERE m.conversation_id = c.id 
               AND c.id = $1 
               AND c.user_id = $2 
               AND m.role = 'nova'`,
            [conversationId, userId]
        );
    } else {
        await db.pool.query('UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND role = \'nova\'', [conversationId]);
    }
}
export async function markAllMessagesRead(userId) {
    await db.pool.query('UPDATE messages m SET is_read = TRUE FROM conversations c WHERE m.conversation_id = c.id AND c.user_id = $1 AND m.role = \'nova\'', [userId]);
}
export async function getMessagesSince(conversationId, userId, since, limit = 50) {
    const result = await db.pool.query(`SELECT m.* FROM messages m 
         JOIN conversations c ON m.conversation_id = c.id 
         WHERE m.conversation_id = $1 AND c.user_id = $2 AND m.created_at > $3 
         ORDER BY m.created_at ASC LIMIT $4`, [conversationId, userId, since, limit]);
    return result.rows;
}
export async function getMessages(conversationId, limit = 50) {
    const result = await db.pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2', [conversationId, limit]);
    return result.rows;
}
export async function getRecentMemory(userId, limit = 10) {
    const result = await db.pool.query(`SELECT m.role, m.content FROM messages m 
         JOIN conversations c ON m.conversation_id = c.id 
         WHERE c.user_id = $1 AND c.is_deleted = FALSE 
         ORDER BY m.created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows.reverse().map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }));
}
export async function getMessagesByDateRange(startDate, endDate) {
    const result = await db.pool.query('SELECT * FROM messages WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at ASC', [startDate, endDate]);
    return result.rows;
}
// ──────────────────────────── Trend Analyses ────────────────────────────
export async function saveTrendAnalysis(userId, topic, analysis, score, cluster = 'CORE') {
    const result = await db.pool.query('INSERT INTO trend_analyses (user_id, topic, cluster, analysis, score) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, topic, cluster.toUpperCase(), analysis, score]);
    return result.rows[0];
}
export async function getTrendAnalyses(userId, limit = 20) {
    const result = await db.pool.query('SELECT * FROM trend_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}
export async function deleteTrendAnalysis(id, userId) {
    await db.pool.query('DELETE FROM trend_analyses WHERE id = $1 AND user_id = $2', [id, userId]);
}
export async function getTrendAggregation(userId) {
    const result = await db.pool.query(`SELECT 
            cluster, 
            AVG(score) as avg_score, 
            COUNT(*) as frequency,
            MAX(created_at) as last_detected
         FROM trend_analyses 
         WHERE user_id = $1 
         GROUP BY cluster 
         ORDER BY avg_score DESC`, [userId]);
    return result.rows;
}
// ──────────────────────────── Security Audit ────────────────────────────
export async function logSecurityEvent(userId, event) {
    await db.pool.query('INSERT INTO security_audit_logs (user_id, event_type, actor, risk_level, details, metadata) VALUES ($1, $2, $3, $4, $5, $6)', [userId, event.event_type, event.actor || 'SYSTEM', event.risk_level || 'LOW', event.details, event.metadata || null]);
}
export async function getSecurityLogs(userId, limit = 20) {
    const result = await db.pool.query('SELECT * FROM security_audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}
// ──────────────────────────── Agent Network ────────────────────────────
export async function addAgent(name, description, capabilities) {
    const result = await db.pool.query('INSERT INTO agent_network (name, description, capabilities) VALUES ($1, $2, $3) RETURNING *', [name, description, capabilities]);
    return result.rows[0];
}
export async function getAgents() {
    const result = await db.pool.query('SELECT * FROM agent_network ORDER BY trust_score DESC');
    return result.rows;
}
export async function updateAgentTrustScore(id, trustScore) {
    await db.pool.query('UPDATE agent_network SET trust_score = $1 WHERE id = $2', [trustScore, id]);
}
export async function updateAgentStatus(id, status) {
    await db.pool.query('UPDATE agent_network SET status = $1 WHERE id = $2', [status, id]);
}
export async function updateAgentCollaboration(id) {
    await db.pool.query('UPDATE agent_network SET last_collaboration = NOW() WHERE id = $1', [id]);
}
// ──────────────────────────── Intelligence & Raids ────────────────────────────
export async function saveRaidResult(userId, raid) {
    const result = await db.pool.query('INSERT INTO intelligence_raids (user_id, category, risk_level, source_platform, content, summary, tags, metadata, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', [userId, raid.category, raid.risk_level, raid.source_platform, raid.content, raid.summary, JSON.stringify(raid.tags), raid.metadata ? JSON.stringify(raid.metadata) : null, raid.ride_type || 'mid-week', raid.opportunity_score || 0, raid.status || 'active']);
    return result.rows[0];
}
export async function getRaidResults(userId, limit = 50) {
    const result = await db.pool.query('SELECT * FROM intelligence_raids WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}
export async function deleteRaidResult(id, userId) {
    await db.pool.query('DELETE FROM intelligence_raids WHERE id = $1 AND user_id = $2', [id, userId]);
}
export async function bulkDeleteRaidResults(ids, userId) {
    if (ids.length === 0)
        return;
    await db.pool.query('DELETE FROM intelligence_raids WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
}
export async function saveWeeklyReport(userId, report) {
    const result = await db.pool.query('INSERT INTO weekly_reports (user_id, report_data, period_start, period_end, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [userId, report.report_data, report.period_start, report.period_end, report.ride_type || 'end-week', report.opportunity_score || 0, report.status || 'active']);
    return result.rows[0];
}
export async function getWeeklyReports(userId, limit = 20) {
    const result = await db.pool.query("SELECT * FROM weekly_reports WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT $2", [userId, limit]);
    return result.rows;
}
export async function filterReports(userId, filters) {
    let query = "SELECT * FROM weekly_reports WHERE user_id = $1";
    const params = [userId];
    let paramIdx = 2;
    if (filters.topic) {
        query += ` AND report_data->>'report_data' ILIKE $${paramIdx++}`;
        params.push(`%${filters.topic}%`);
    }
    if (filters.risk_level) {
        query += ` AND report_data->>'report_data' ILIKE $${paramIdx++}`;
        params.push(`%${filters.risk_level}%`);
    }
    if (filters.min_score !== undefined) {
        query += ` AND opportunity_score >= $${paramIdx++}`;
        params.push(filters.min_score);
    }
    if (filters.ride_type) {
        query += ` AND ride_type = $${paramIdx++}`;
        params.push(filters.ride_type);
    }
    if (filters.date_start) {
        query += ` AND created_at >= $${paramIdx++}`;
        params.push(filters.date_start);
    }
    if (filters.date_end) {
        query += ` AND created_at <= $${paramIdx++}`;
        params.push(filters.date_end);
    }
    query += ` AND status = $${paramIdx++} ORDER BY created_at DESC`;
    params.push(filters.status || 'active');
    const result = await db.pool.query(query, params);
    return result.rows;
}
export async function softDeleteReport(id, userId) {
    await db.pool.query("UPDATE weekly_reports SET status = 'archived' WHERE id = $1 AND user_id = $2", [id, userId]);
}
export async function permanentDeleteReport(id, userId) {
    await db.pool.query("DELETE FROM weekly_reports WHERE id = $1 AND user_id = $2", [id, userId]);
}
export async function bulkDeleteReports(ids, userId) {
    if (ids.length === 0)
        return;
    await db.pool.query('DELETE FROM weekly_reports WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
}
// ──────────────────────────── Notifications ────────────────────────────
export async function createNotification(userId, data) {
    const result = await db.pool.query('INSERT INTO notifications (user_id, title, category, risk_level, monetization_potential, content, priority, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [userId, data.title, data.category, data.risk_level, data.monetization_potential, data.content, data.priority, data.metadata ? JSON.stringify(data.metadata) : null]);
    return result.rows[0];
}
export async function getNotifications(userId, limit = 30, includeRead = true) {
    const readFilter = includeRead ? '' : 'AND is_read = FALSE';
    const archivedFilter = 'AND is_archived = FALSE';
    const result = await db.pool.query(`SELECT * FROM notifications WHERE user_id = $1 ${readFilter} ${archivedFilter} ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows;
}
export async function getUnreadNotificationCount(userId) {
    const result = await db.pool.query('SELECT COUNT(*), COUNT(*) FILTER (WHERE priority = \'critical\') as urgent_count FROM notifications WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE', [userId]);
    return {
        count: parseInt(result.rows[0].count, 10),
        hasUrgent: parseInt(result.rows[0].urgent_count, 10) > 0
    };
}
export async function markNotificationRead(id, userId) {
    await db.pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
}
export async function archiveNotification(id, userId) {
    await db.pool.query('UPDATE notifications SET is_archived = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
}
// ──────────────────────────── Push Subscriptions ────────────────────────────
export async function savePushSubscription(userId, deviceId, subscription) {
    const subscriptionData = JSON.stringify(subscription);
    await db.pool.query(`INSERT INTO push_subscriptions (user_id, device_id, subscription_data) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (device_id) DO UPDATE SET subscription_data = $3`, [userId, deviceId, subscriptionData]);
}
export async function getPushSubscriptions(userId) {
    const result = await db.pool.query('SELECT subscription_data FROM push_subscriptions WHERE user_id = $1', [userId]);
    return result.rows.map((r) => r.subscription_data);
}
export async function deletePushSubscription(deviceId) {
    await db.pool.query('DELETE FROM push_subscriptions WHERE device_id = $1', [deviceId]);
}
export async function updateDeviceNotificationStatus(deviceId, enabled) {
    await db.pool.query('UPDATE devices SET notifications_enabled = $1 WHERE id = $2', [enabled, deviceId]);
}
export async function logAgentActivity(action) {
    await db.pool.query('INSERT INTO agent_activity_logs (agent_id, action_type, platform, details, metadata) VALUES ($1, $2, $3, $4, $5)', [action.agent_id || 'Karuppu', action.action_type, action.platform || 'INTERNAL', action.details, action.metadata || null]);
}
export async function saveIntelligenceLog(userId, data) {
    const result = await db.pool.query('INSERT INTO intelligence_logs (user_id, category, lesson, source_context, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, data.category, data.lesson, data.source_context || null, data.metadata || null]);
    return result.rows[0];
}
export async function getIntelligenceLogs(userId, limit = 50) {
    const result = await db.pool.query('SELECT id, category, lesson, source_context AS source, metadata, created_at FROM intelligence_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}
// ──────────────────────────── Command Center Tasks ────────────────────────────
export function mapToCanonicalStatus(status) {
    const canonical = (status || 'TODO').toUpperCase().trim();
    if (['DONE', 'COMPLETED', 'FINISHED', 'COMPLETE'].includes(canonical)) {
        return 'COMPLETED';
    }
    if (['PROCESS', 'IN_PROGRESS', 'IN-PROGRESS', 'PROGRESS', 'STARTING', 'START', 'ACTIVE', 'RUNNING'].includes(canonical)) {
        return 'PROCESS';
    }
    if (['BLOCKED', 'STUCK', 'PAUSED', 'HOLD'].includes(canonical)) {
        return 'BLOCKED';
    }
    return 'TODO';
}
export async function createTask(userId, task, customTaskIdStr) {
    try {
        let taskIdStr = customTaskIdStr;
        if (!taskIdStr) {
            // Auto-increment logic
            let nextIdNum = 1;
            const result = await db.pool.query('SELECT task_id_str FROM tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
            if (result.rows.length > 0) {
                const lastId = parseInt(result.rows[0].task_id_str, 10);
                if (!isNaN(lastId))
                    nextIdNum = lastId + 1;
            }
            taskIdStr = nextIdNum.toString().padStart(3, '0');
        }
        const owner = task.owner || 'Karuppu';
        const priority = task.priority || 'MEDIUM';
        const duration = task.duration || 'MEDIUM';
        const actionPlan = task.action_plan || '';
        const notes = task.notes || '';
        const rawStatus = task.status || 'TODO';
        const status = mapToCanonicalStatus(rawStatus);
        const deadline = task.deadline || null;
        const res = await db.pool.query(`INSERT INTO tasks (user_id, task_id_str, task_name, owner, priority, duration, action_plan, notes, status, deadline)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [userId, taskIdStr, task.task_name, owner, priority, duration, actionPlan, notes, status, deadline]);
        return res.rows[0];
    }
    catch (error) {
        console.error('[DB] Task Creation Error:', error);
        throw error;
    }
}
export async function getTasks(userId, includeArchived = false) {
    const archivedFilter = includeArchived ? '' : 'AND is_archived = FALSE';
    const result = await db.pool.query(`SELECT * FROM tasks WHERE user_id = $1 ${archivedFilter} ORDER BY task_id_str ASC`, [userId]);
    return result.rows;
}
export async function archiveTask(userId, taskIdStr, isArchived = true) {
    const result = await db.pool.query('UPDATE tasks SET is_archived = $1, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *', [isArchived, userId, taskIdStr]);
    return result.rows[0];
}
export async function updateTaskStatus(userId, taskIdStr, status, notes) {
    let queryArgs = [];
    let queryStr = '';
    // Disable automatic archiving to keep completed tasks visible in the main view
    const archiveClause = '';
    const canonicalStatus = mapToCanonicalStatus(status);
    if (notes !== undefined) {
        queryStr = `UPDATE tasks SET status = $1, notes = $2${archiveClause}, updated_at = NOW() WHERE user_id = $3 AND (task_id_str = $4 OR id::text = $4) RETURNING *`;
        queryArgs = [canonicalStatus, notes, userId, taskIdStr];
    }
    else {
        queryStr = `UPDATE tasks SET status = $1${archiveClause}, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *`;
        queryArgs = [canonicalStatus, userId, taskIdStr];
    }
    const result = await db.pool.query(queryStr, queryArgs);
    return result.rows[0];
}
export async function updateTaskAssignment(userId, taskIdStr, owner) {
    const result = await db.pool.query('UPDATE tasks SET owner = $1, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *', [owner.toUpperCase(), userId, taskIdStr]);
    return result.rows[0];
}
export async function deleteTask(id, userId) {
    await db.pool.query('DELETE FROM tasks WHERE task_id_str = $1 AND user_id = $2', [id, userId]);
}
export async function bulkDeleteTasks(ids, userId) {
    if (ids.length === 0)
        return;
    await db.pool.query('DELETE FROM tasks WHERE task_id_str = ANY($1) AND user_id = $2', [ids, userId]);
}
export async function deleteAllTasks(userId) {
    await db.pool.query('DELETE FROM tasks WHERE user_id = $1', [userId]);
}
// ──────────────────────────── Duplicate Prevention ────────────────────────────
/**
 * Check if a notification with the same title was created for this user within the given time window.
 * Returns true if a duplicate exists (i.e., should be SKIPPED).
 */
export async function findRecentDuplicateNotification(userId, title, windowMinutes = 60) {
    const result = await db.pool.query(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND title = $2 AND created_at >= NOW() - INTERVAL '1 minute' * $3`, [userId, title, windowMinutes]);
    return parseInt(result.rows[0].cnt, 10) > 0;
}
/**
 * Check if a raid result for the same category was saved for this user within the given time window.
 * Returns true if a duplicate exists (i.e., should be SKIPPED).
 */
export async function findRecentDuplicateRaid(userId, category, windowHours = 12) {
    const result = await db.pool.query(`SELECT COUNT(*) as cnt FROM intelligence_raids WHERE user_id = $1 AND category = $2 AND created_at >= NOW() - INTERVAL '1 hour' * $3`, [userId, category, windowHours]);
    return parseInt(result.rows[0].cnt, 10) > 0;
}
// ──────────────────────────── Improvement Logs (Continuous Learning) ────────────────────────────
/**
 * Save a continuous improvement log entry generated by the autonomy heartbeat.
 */
export async function saveImprovementLog(userId, data) {
    const result = await db.pool.query('INSERT INTO improvement_logs (user_id, cycle_id, insight, strategy_adjustment, performance_delta, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [userId, data.cycle_id, data.insight, data.strategy_adjustment || '', data.performance_delta || '', data.metadata || null]);
    return result.rows[0];
}
/**
 * Get recent improvement logs for a user.
 */
export async function getImprovementLogs(userId, limit = 20) {
    const result = await db.pool.query('SELECT * FROM improvement_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}
// ──────────────────────────── Task Progress Stats ────────────────────────────
/**
 * Get real-time task progress statistics for a user.
 */
export async function getTaskProgress(userId) {
    const tasks = await getTasks(userId);
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
    const stuck = tasks.filter(t => {
        if (t.status !== 'PROCESS')
            return false;
        const updated = new Date(t.updated_at).getTime();
        return (now - updated) > STUCK_THRESHOLD_MS;
    });
    return {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        in_progress: tasks.filter(t => t.status === 'PROCESS').length,
        todo: tasks.filter(t => t.status === 'TODO').length,
        blocked: tasks.filter(t => t.status === 'BLOCKED').length,
        stuck,
        by_assignee: { nova: tasks.filter(t => t.owner === 'Karuppu').length, operator: tasks.filter(t => t.owner === 'OPERATOR').length, shared: tasks.filter(t => t.owner === 'SHARED').length }
    };
}
export async function archiveAllNotifications(userId) {
    await db.pool.query('UPDATE notifications SET is_archived = TRUE WHERE user_id = $1 AND is_archived = FALSE', [userId]);
}
export async function markAllNotificationsRead(userId) {
    await db.pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
}
const queries = {
    getConversationDetail,
    getConversations,
    updateConversationTitle,
    updateConversationTopic,
    deleteConversation,
    searchConversations,
    createConversation,
    getConversationById,
    addMessage,
    getMessages,
    getRecentMemory,
    getMessagesByDateRange,
    saveTrendAnalysis,
    getTrendAnalyses,
    deleteTrendAnalysis,
    addAgent,
    getAgents,
    updateAgentTrustScore,
    updateAgentStatus,
    updateAgentCollaboration,
    saveRaidResult,
    getRaidResults,
    deleteRaidResult,
    bulkDeleteRaidResults,
    saveWeeklyReport,
    getWeeklyReports,
    filterReports,
    softDeleteReport,
    permanentDeleteReport,
    bulkDeleteReports,
    createNotification,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    archiveNotification,
    archiveAllNotifications,
    getUnreadMessageCount,
    markMessagesRead,
    markAllMessagesRead,
    getMessagesSince,
    savePushSubscription,
    getPushSubscriptions,
    deletePushSubscription,
    updateDeviceNotificationStatus,
    logAgentActivity,
    saveIntelligenceLog,
    getIntelligenceLogs,
    createTask,
    getTasks,
    updateTaskStatus,
    mapToCanonicalStatus,
    updateTaskAssignment,
    archiveTask,
    deleteTask,
    bulkDeleteTasks,
    deleteAllTasks,
    findRecentDuplicateNotification,
    findRecentDuplicateRaid,
    saveImprovementLog,
    getImprovementLogs,
    getTaskProgress,
    getTrendAggregation,
    logSecurityEvent,
    getSecurityLogs,
    upsertRaidStatus,
    getRaidStatus,
    markAllNotificationsRead
};
/**
 * Update raid status in DB (replaces in-memory Map for serverless compatibility)
 */
export async function upsertRaidStatus(userId, status) {
    const pool = db.pool;
    if (!pool)
        return;
    await pool.query(`
        INSERT INTO raid_status (user_id, status, current_cluster, clusters_completed, total_clusters, last_started, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            status = COALESCE(EXCLUDED.status, raid_status.status),
            current_cluster = COALESCE(EXCLUDED.current_cluster, raid_status.current_cluster),
            clusters_completed = COALESCE(EXCLUDED.clusters_completed, raid_status.clusters_completed),
            total_clusters = COALESCE(EXCLUDED.total_clusters, raid_status.total_clusters),
            updated_at = NOW()
    `, [userId, status.status || null, status.current_cluster || null, status.clusters_completed ?? null, status.total_clusters ?? null]);
}
/**
 * Get current raid status from DB
 */
export async function getRaidStatus(userId) {
    const pool = db.pool;
    if (!pool)
        return null;
    const result = await pool.query('SELECT * FROM raid_status WHERE user_id = $1', [userId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    // Auto-clear stale statuses (older than 30 minutes = must have failed)
    const updatedAt = new Date(row.updated_at).getTime();
    if (Date.now() - updatedAt > 30 * 60 * 1000 && row.status !== 'idle' && row.status !== 'completed') {
        await pool.query("UPDATE raid_status SET status = 'idle' WHERE user_id = $1", [userId]);
        return null;
    }
    return {
        status: row.status,
        current_cluster: row.current_cluster,
        clusters_completed: row.clusters_completed,
        total_clusters: row.total_clusters,
        last_started: row.last_started,
        updated_at: row.updated_at,
    };
}
export default queries;
