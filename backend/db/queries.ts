import db from './connection.js';
import { Conversation, Message, TrendAnalysis, TrendData, Agent, TaskOwner, TaskPriority, TaskDuration, TaskStatus } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// ──────────────────────────── Conversations ────────────────────────────

export async function getConversationDetail(conversationId: string, userId: string): Promise<any> {
    const conv = await getConversationById(conversationId, userId);
    if (!conv) return null;

    const messages = await getMessages(conversationId);
    return {
        ...conv,
        messages
    };
}

export async function createConversation(userId: string, title: string = 'New Conversation'): Promise<Conversation> {
    const result = await db.pool.query(
        'INSERT INTO conversations (title, user_id) VALUES ($1, $2) RETURNING *',
        [title, userId]
    );
    return result.rows[0];
}

export async function getConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    includeDeleted: boolean = false
): Promise<Conversation[]> {
    const deletedFilter = includeDeleted ? '' : 'AND is_deleted = FALSE';

    const result = await db.pool.query(
        `SELECT * FROM conversations WHERE user_id = $1 ${deletedFilter} ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

export async function getConversationById(id: string, userId: string): Promise<Conversation | null> {
    const result = await db.pool.query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
}

export async function updateConversationTitle(id: string, userId: string, title: string): Promise<void> {
    await db.pool.query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [title, id, userId]
    );
}

export async function updateConversationTopic(id: string, userId: string, topicTag: string): Promise<void> {
    await db.pool.query(
        'UPDATE conversations SET topic_tag = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [topicTag, id, userId]
    );
}

export async function deleteConversation(id: string, userId: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
        await db.pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
        await db.pool.query('UPDATE conversations SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId]);
    }
}

export async function searchConversations(userId: string, query: string, limit: number = 20): Promise<Conversation[]> {
    const searchTerm = `%${query}%`;
    const result = await db.pool.query(
        'SELECT * FROM conversations WHERE user_id = $1 AND (title ILIKE $2 OR topic_tag ILIKE $2) AND is_deleted = FALSE ORDER BY updated_at DESC LIMIT $3',
        [userId, searchTerm, limit]
    );
    return result.rows;
}

// ──────────────────────────── Messages ────────────────────────────

export async function addMessage(
    conversationId: string,
    role: 'user' | 'nova',
    content: string,
    metadata: object | null = null
): Promise<Message> {
    const isRead = role === 'user'; // User messages are read by default
    const result = await db.pool.query(
        'INSERT INTO messages (conversation_id, role, content, metadata, is_read) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [conversationId, role, content, metadata, isRead]
    );
    await db.pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    return result.rows[0];
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db.pool.query(
        'SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1 AND m.role = \'nova\' AND m.is_read = FALSE',
        [userId]
    );
    return parseInt(result.rows[0].count, 10);
}

export async function markMessagesRead(conversationId: string): Promise<void> {
    await db.pool.query('UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND role = \'nova\'', [conversationId]);
}

export async function markAllMessagesRead(userId: string): Promise<void> {
    await db.pool.query(
        'UPDATE messages m SET is_read = TRUE FROM conversations c WHERE m.conversation_id = c.id AND c.user_id = $1 AND m.role = \'nova\'',
        [userId]
    );
}

export async function getMessagesSince(conversationId: string, userId: string, since: string, limit: number = 50): Promise<Message[]> {
    const result = await db.pool.query(
        `SELECT m.* FROM messages m 
         JOIN conversations c ON m.conversation_id = c.id 
         WHERE m.conversation_id = $1 AND c.user_id = $2 AND m.created_at > $3 
         ORDER BY m.created_at ASC LIMIT $4`,
        [conversationId, userId, since, limit]
    );
    return result.rows;
}

export async function getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    const result = await db.pool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
        [conversationId, limit]
    );
    return result.rows;
}

export async function getRecentMemoryContext(userId: string, currentConversationId?: string, limit: number = 10): Promise<string> {
    // Pull the latest messages for this user across ANY conversation to provide global context
    const result = await db.pool.query(
        `SELECT m.* FROM messages m 
         JOIN conversations c ON m.conversation_id = c.id 
         WHERE c.user_id = $1 AND c.is_deleted = FALSE 
         ORDER BY m.created_at DESC LIMIT $2`,
        [userId, limit]
    );
    const messages = result.rows.reverse(); // Back to chronological for the prompt

    if (messages.length === 0) return 'No previous strategic memory context available.';

    return messages
        .map(m => {
            const role = m.role === 'user' ? 'OPERATOR' : 'NOVA';
            return `${role}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`;
        })
        .join('\n');
}

export async function getMessagesByDateRange(startDate: Date, endDate: Date): Promise<Message[]> {
    const result = await db.pool.query(
        'SELECT * FROM messages WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at ASC',
        [startDate, endDate]
    );
    return result.rows;
}
// ──────────────────────────── Trend Analyses ────────────────────────────

export async function saveTrendAnalysis(
    userId: string,
    topic: string,
    analysis: TrendData,
    score: number,
    cluster: string = 'CORE'
): Promise<TrendAnalysis> {
    const result = await db.pool.query(
        'INSERT INTO trend_analyses (user_id, topic, cluster, analysis, score) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, topic, cluster.toUpperCase(), analysis, score]
    );
    return result.rows[0];
}


export async function getTrendAnalyses(userId: string, limit: number = 20): Promise<TrendAnalysis[]> {
    const result = await db.pool.query(
        'SELECT * FROM trend_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    );
    return result.rows;
}

export async function deleteTrendAnalysis(id: string, userId: string): Promise<void> {
    await db.pool.query('DELETE FROM trend_analyses WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function getTrendAggregation(userId: string): Promise<any[]> {
    const result = await db.pool.query(
        `SELECT 
            cluster, 
            AVG(score) as avg_score, 
            COUNT(*) as frequency,
            MAX(created_at) as last_detected
         FROM trend_analyses 
         WHERE user_id = $1 
         GROUP BY cluster 
         ORDER BY avg_score DESC`,
        [userId]
    );
    return result.rows;
}

// ──────────────────────────── Security Audit ────────────────────────────

export async function logSecurityEvent(userId: string, event: {
    event_type: string;
    actor?: string;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
    details: string;
    metadata?: object;
}): Promise<void> {
    await db.pool.query(
        'INSERT INTO security_audit_logs (user_id, event_type, actor, risk_level, details, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, event.event_type, event.actor || 'SYSTEM', event.risk_level || 'LOW', event.details, event.metadata || null]
    );
}

export async function getSecurityLogs(userId: string, limit: number = 20): Promise<any[]> {
    const result = await db.pool.query(
        'SELECT * FROM security_audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    );
    return result.rows;
}

// ──────────────────────────── Agent Network ────────────────────────────

export async function addAgent(
    name: string,
    description: string,
    capabilities: string[]
): Promise<Agent> {
    const result = await db.pool.query(
        'INSERT INTO agent_network (name, description, capabilities) VALUES ($1, $2, $3) RETURNING *',
        [name, description, capabilities]
    );
    return result.rows[0];
}

export async function getAgents(): Promise<Agent[]> {
    const result = await db.pool.query(
        'SELECT * FROM agent_network ORDER BY trust_score DESC'
    );
    return result.rows;
}

export async function updateAgentTrustScore(id: string, trustScore: number): Promise<void> {
    await db.pool.query('UPDATE agent_network SET trust_score = $1 WHERE id = $2', [trustScore, id]);
}

export async function updateAgentStatus(id: string, status: 'active' | 'inactive' | 'flagged'): Promise<void> {
    await db.pool.query('UPDATE agent_network SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateAgentCollaboration(id: string): Promise<void> {
    await db.pool.query('UPDATE agent_network SET last_collaboration = NOW() WHERE id = $1', [id]);
}

// ──────────────────────────── Intelligence & Raids ────────────────────────────

export async function saveRaidResult(userId: string, raid: {
    category: string;
    risk_level: 'Low' | 'Medium' | 'High';
    source_platform: string;
    content: string;
    summary: string;
    tags: string[];
    metadata?: object;
    ride_type?: 'mid-week' | 'end-week' | 'emergency';
    opportunity_score?: number;
    status?: 'active' | 'archived' | 'deleted';
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO intelligence_raids (user_id, category, risk_level, source_platform, content, summary, tags, metadata, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [userId, raid.category, raid.risk_level, raid.source_platform, raid.content, raid.summary, JSON.stringify(raid.tags), raid.metadata ? JSON.stringify(raid.metadata) : null, raid.ride_type || 'mid-week', raid.opportunity_score || 0, raid.status || 'active']
    );
    return result.rows[0];
}

export async function getRaidResults(userId: string, limit: number = 50): Promise<any[]> {
    const result = await db.pool.query('SELECT * FROM intelligence_raids WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    return result.rows;
}

export async function deleteRaidResult(id: string, userId: string): Promise<void> {
    await db.pool.query('DELETE FROM intelligence_raids WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function bulkDeleteRaidResults(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    await db.pool.query('DELETE FROM intelligence_raids WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
}

export async function saveWeeklyReport(userId: string, report: {
    report_data: object;
    period_start: Date;
    period_end: Date;
    ride_type?: 'mid-week' | 'end-week' | 'emergency';
    opportunity_score?: number;
    status?: 'active' | 'archived' | 'deleted';
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO weekly_reports (user_id, report_data, period_start, period_end, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, report.report_data, report.period_start, report.period_end, report.ride_type || 'end-week', report.opportunity_score || 0, report.status || 'active']
    );
    return result.rows[0];
}

export async function getWeeklyReports(userId: string, limit: number = 20): Promise<any[]> {
    const result = await db.pool.query("SELECT * FROM weekly_reports WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT $2", [userId, limit]);
    return result.rows;
}

export async function filterReports(userId: string, filters: {
    topic?: string;
    risk_level?: string;
    min_score?: number;
    ride_type?: string;
    date_start?: string;
    date_end?: string;
    status?: string;
}): Promise<any[]> {
    let query = "SELECT * FROM weekly_reports WHERE user_id = $1";
    const params: any[] = [userId];
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

export async function softDeleteReport(id: string, userId: string): Promise<void> {
    await db.pool.query("UPDATE weekly_reports SET status = 'archived' WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function permanentDeleteReport(id: string, userId: string): Promise<void> {
    await db.pool.query("DELETE FROM weekly_reports WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function bulkDeleteReports(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    await db.pool.query('DELETE FROM weekly_reports WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
}

// ──────────────────────────── Notifications ────────────────────────────
export async function createNotification(userId: string, data: {
    title: string;
    category: string;
    risk_level: 'Low' | 'Medium' | 'High';
    monetization_potential: string;
    content: string;
    priority: 'normal' | 'high' | 'critical';
    metadata?: object;
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO notifications (user_id, title, category, risk_level, monetization_potential, content, priority, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [userId, data.title, data.category, data.risk_level, data.monetization_potential, data.content, data.priority, data.metadata ? JSON.stringify(data.metadata) : null]
    );
    return result.rows[0];
}

export async function getNotifications(userId: string, limit: number = 30, includeRead: boolean = true): Promise<any[]> {
    const readFilter = includeRead ? '' : 'AND is_read = FALSE';
    const archivedFilter = 'AND is_archived = FALSE';

    const result = await db.pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ${readFilter} ${archivedFilter} ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}

export async function getUnreadNotificationCount(userId: string): Promise<{ count: number; hasUrgent: boolean }> {
    const result = await db.pool.query(
        'SELECT COUNT(*), COUNT(*) FILTER (WHERE priority = \'critical\') as urgent_count FROM notifications WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE',
        [userId]
    );
    return {
        count: parseInt(result.rows[0].count, 10),
        hasUrgent: parseInt(result.rows[0].urgent_count, 10) > 0
    };
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
    await db.pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
}

export async function archiveNotification(id: string, userId: string): Promise<void> {
    await db.pool.query('UPDATE notifications SET is_archived = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
}

// ──────────────────────────── Push Subscriptions ────────────────────────────

export async function savePushSubscription(userId: string, deviceId: string, subscription: any): Promise<void> {
    const subscriptionData = JSON.stringify(subscription);
    await db.pool.query(
        `INSERT INTO push_subscriptions (user_id, device_id, subscription_data) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (device_id) DO UPDATE SET subscription_data = $3`,
        [userId, deviceId, subscriptionData]
    );
}

export async function getPushSubscriptions(userId: string): Promise<any[]> {
    const result = await db.pool.query('SELECT subscription_data FROM push_subscriptions WHERE user_id = $1', [userId]);
    return result.rows.map((r: any) => r.subscription_data);
}

export async function deletePushSubscription(deviceId: string): Promise<void> {
    await db.pool.query('DELETE FROM push_subscriptions WHERE device_id = $1', [deviceId]);
}

export async function updateDeviceNotificationStatus(deviceId: string, enabled: boolean): Promise<void> {
    await db.pool.query('UPDATE devices SET notifications_enabled = $1 WHERE id = $2', [enabled, deviceId]);
}

export async function logAgentActivity(action: {
    agent_id?: string;
    action_type: string;
    platform?: string;
    details: string;
    metadata?: object;
}): Promise<void> {
    await db.pool.query(
        'INSERT INTO agent_activity_logs (agent_id, action_type, platform, details, metadata) VALUES ($1, $2, $3, $4, $5)',
        [action.agent_id || 'NOVA', action.action_type, action.platform || 'INTERNAL', action.details, action.metadata || null]
    );
}

export async function saveIntelligenceLog(userId: string, data: {
    category: string;
    lesson: string;
    source_context?: string;
    metadata?: object;
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO intelligence_logs (user_id, category, lesson, source_context, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, data.category, data.lesson, data.source_context || null, data.metadata || null]
    );
    return result.rows[0];
}

export async function getIntelligenceLogs(userId: string, limit: number = 50): Promise<any[]> {
    const result = await db.pool.query(
        'SELECT id, category, lesson, source_context AS source, metadata, created_at FROM intelligence_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    );
    return result.rows;
}

// ──────────────────────────── Command Center Tasks ────────────────────────────

export async function createTask(userId: string, task: {
    task_name: string;
    owner?: TaskOwner;
    priority?: TaskPriority;
    duration?: TaskDuration;
    action_plan?: string;
    notes?: string;
    status?: TaskStatus;
    deadline?: Date;
}, customTaskIdStr?: string): Promise<any> {
    try {
        let taskIdStr = customTaskIdStr;

        if (!taskIdStr) {
            // Auto-increment logic
            let nextIdNum = 1;
            const result = await db.pool.query('SELECT task_id_str FROM tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
            if (result.rows.length > 0) {
                const lastId = parseInt(result.rows[0].task_id_str, 10);
                if (!isNaN(lastId)) nextIdNum = lastId + 1;
            }
            taskIdStr = nextIdNum.toString().padStart(3, '0');
        }

        const owner = task.owner || 'NOVA';
        const priority = task.priority || 'MEDIUM';
        const duration = task.duration || 'MEDIUM';
        const actionPlan = task.action_plan || '';
        const notes = task.notes || '';
        const status = task.status || 'TODO';
        const deadline = task.deadline || null;

        const res = await db.pool.query(
            `INSERT INTO tasks (user_id, task_id_str, task_name, owner, priority, duration, action_plan, notes, status, deadline)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [userId, taskIdStr, task.task_name, owner, priority, duration, actionPlan, notes, status, deadline]
        );
        return res.rows[0];
    } catch (error) {
        console.error('[DB] Task Creation Error:', error);
        throw error;
    }
}

export async function getTasks(userId: string, includeArchived: boolean = false): Promise<any[]> {
    const archivedFilter = includeArchived ? '' : 'AND is_archived = FALSE';
    const result = await db.pool.query(
        `SELECT * FROM tasks WHERE user_id = $1 ${archivedFilter} ORDER BY task_id_str ASC`,
        [userId]
    );
    return result.rows;
}

export async function archiveTask(userId: string, taskIdStr: string, isArchived: boolean = true): Promise<any> {
    const result = await db.pool.query(
        'UPDATE tasks SET is_archived = $1, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *',
        [isArchived, userId, taskIdStr]
    );
    return result.rows[0];
}

export async function updateTaskStatus(
    userId: string, 
    taskIdStr: string, 
    status: string, 
    notes?: string
): Promise<any> {
    let queryArgs: any[] = [];
    let queryStr = '';

    // Automatic archiving if status is 'DONE' or 'COMPLETED'
    const isDone = ['DONE', 'COMPLETED'].includes(status.toUpperCase());
    const archiveClause = isDone ? ', is_archived = TRUE' : '';

    if (notes !== undefined) {
        queryStr = `UPDATE tasks SET status = $1, notes = $2${archiveClause}, updated_at = NOW() WHERE user_id = $3 AND (task_id_str = $4 OR id::text = $4) RETURNING *`;
        queryArgs = [status.toUpperCase(), notes, userId, taskIdStr];
    } else {
        queryStr = `UPDATE tasks SET status = $1${archiveClause}, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *`;
        queryArgs = [status.toUpperCase(), userId, taskIdStr];
    }

    const result = await db.pool.query(queryStr, queryArgs);
    return result.rows[0];
}

export async function updateTaskAssignment(userId: string, taskIdStr: string, owner: string): Promise<any> {
    const result = await db.pool.query(
        'UPDATE tasks SET owner = $1, updated_at = NOW() WHERE user_id = $2 AND (task_id_str = $3 OR id::text = $3) RETURNING *',
        [owner.toUpperCase(), userId, taskIdStr]
    );
    return result.rows[0];
}

export async function deleteTask(taskIdStr: string, userId: string): Promise<void> {
    await db.pool.query('DELETE FROM tasks WHERE user_id = $1 AND (task_id_str = $2 OR id::text = $2)', [userId, taskIdStr]);
}

export async function deleteAllTasks(userId: string): Promise<void> {
    await db.pool.query('DELETE FROM tasks WHERE user_id = $1', [userId]);
}

// ──────────────────────────── Duplicate Prevention ────────────────────────────

/**
 * Check if a notification with the same title was created for this user within the given time window.
 * Returns true if a duplicate exists (i.e., should be SKIPPED).
 */
export async function findRecentDuplicateNotification(userId: string, title: string, windowMinutes: number = 60): Promise<boolean> {
    const result = await db.pool.query(
        `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND title = $2 AND created_at >= NOW() - INTERVAL '1 minute' * $3`,
        [userId, title, windowMinutes]
    );
    return parseInt(result.rows[0].cnt, 10) > 0;
}

/**
 * Check if a raid result for the same category was saved for this user within the given time window.
 * Returns true if a duplicate exists (i.e., should be SKIPPED).
 */
export async function findRecentDuplicateRaid(userId: string, category: string, windowHours: number = 12): Promise<boolean> {
    const result = await db.pool.query(
        `SELECT COUNT(*) as cnt FROM intelligence_raids WHERE user_id = $1 AND category = $2 AND created_at >= NOW() - INTERVAL '1 hour' * $3`,
        [userId, category, windowHours]
    );
    return parseInt(result.rows[0].cnt, 10) > 0;
}

// ──────────────────────────── Improvement Logs (Continuous Learning) ────────────────────────────

/**
 * Save a continuous improvement log entry generated by the autonomy heartbeat.
 */
export async function saveImprovementLog(userId: string, data: {
    cycle_id: string;
    insight: string;
    strategy_adjustment?: string;
    performance_delta?: string;
    metadata?: object;
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO improvement_logs (user_id, cycle_id, insight, strategy_adjustment, performance_delta, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, data.cycle_id, data.insight, data.strategy_adjustment || '', data.performance_delta || '', data.metadata || null]
    );
    return result.rows[0];
}

/**
 * Get recent improvement logs for a user.
 */
export async function getImprovementLogs(userId: string, limit: number = 20): Promise<any[]> {
    const result = await db.pool.query(
        'SELECT * FROM improvement_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
    );
    return result.rows;
}

// ──────────────────────────── Task Progress Stats ────────────────────────────

/**
 * Get real-time task progress statistics for a user.
 */
export async function getTaskProgress(userId: string): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    todo: number;
    blocked: number;
    stuck: any[];
    by_assignee: { nova: number; operator: number; shared: number };
}> {
    const tasks = await getTasks(userId);
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

    const stuck = tasks.filter(t => {
        if (t.status !== 'IN-PROGRESS') return false;
        const updated = new Date(t.updated_at).getTime();
        return (now - updated) > STUCK_THRESHOLD_MS;
    });

    return {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        in_progress: tasks.filter(t => t.status === 'IN-PROGRESS').length,
        todo: tasks.filter(t => t.status === 'TODO').length,
        blocked: tasks.filter(t => t.status === 'BLOCKED').length,
        stuck,
        by_assignee: { nova: tasks.filter(t => t.owner === 'NOVA').length, operator: tasks.filter(t => t.owner === 'OPERATOR').length, shared: tasks.filter(t => t.owner === 'SHARED').length }
    };
}

export async function archiveAllNotifications(userId: string): Promise<void> {
    await db.pool.query('UPDATE notifications SET is_archived = TRUE WHERE user_id = $1 AND is_archived = FALSE', [userId]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
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
    getRecentMemoryContext,
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
    updateTaskAssignment,
    archiveTask,
    deleteTask,
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
export async function upsertRaidStatus(userId: string, status: {
    status: string;
    current_cluster: string;
    clusters_completed: number;
    total_clusters: number;
}): Promise<void> {
    const pool = db.pool; // Use db.pool as seen in other functions
    if (!pool) return;
    await pool.query(`
        INSERT INTO raid_status (user_id, status, current_cluster, clusters_completed, total_clusters, last_started, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            status = EXCLUDED.status,
            current_cluster = EXCLUDED.current_cluster,
            clusters_completed = EXCLUDED.clusters_completed,
            total_clusters = EXCLUDED.total_clusters,
            updated_at = NOW()
    `, [userId, status.status, status.current_cluster, status.clusters_completed, status.total_clusters]);
}

/**
 * Get current raid status from DB
 */
export async function getRaidStatus(userId: string): Promise<{
    status: string;
    current_cluster: string;
    clusters_completed: number;
    total_clusters: number;
    last_started: string;
} | null> {
    const pool = db.pool;
    if (!pool) return null;
    const result = await pool.query(
        'SELECT * FROM raid_status WHERE user_id = $1',
        [userId]
    );
    if (result.rows.length === 0) return null;
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
    };
}

export default queries;

