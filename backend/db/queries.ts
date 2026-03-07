import { pool, sqliteDb, isPostgresActive } from './connection.js';
import { Conversation, Message, TrendAnalysis, TrendData, Agent } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

function getSqlite() {
    if (!sqliteDb) throw new Error('Database unavailable: Both PostgreSQL and SQLite Fallback failed.');
    return sqliteDb;
}

// ──────────────────────────── Conversations ────────────────────────────

export async function createConversation(userId: string, title: string = 'New Conversation'): Promise<Conversation> {
    if (isPostgresActive) {
        const result = await pool.query(
            'INSERT INTO conversations (title, user_id) VALUES ($1, $2) RETURNING *',
            [title, userId]
        );
        return result.rows[0];
    } else {
        const db = getSqlite();
        const id = uuidv4();
        db.prepare('INSERT INTO conversations (id, title, user_id) VALUES (?, ?, ?)').run(id, title, userId);
        return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;
    }
}

export async function getConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    includeDeleted: boolean = false
): Promise<Conversation[]> {
    const deletedFilter = includeDeleted ? '' : 'AND is_deleted = FALSE';
    const sqliteDeletedFilter = includeDeleted ? '' : 'AND is_deleted = 0';

    if (isPostgresActive) {
        const result = await pool.query(
            `SELECT * FROM conversations WHERE user_id = $1 ${deletedFilter} ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    } else {
        return getSqlite().prepare(`SELECT * FROM conversations WHERE user_id = ? ${sqliteDeletedFilter} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
            .all(userId, limit, offset) as Conversation[];
    }
}

export async function getConversationById(id: string, userId: string): Promise<Conversation | null> {
    if (isPostgresActive) {
        const result = await pool.query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
        return result.rows[0] || null;
    } else {
        return (getSqlite().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId) as Conversation) || null;
    }
}

export async function updateConversationTitle(id: string, userId: string, title: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query(
            'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
            [title, id, userId]
        );
    } else {
        getSqlite().prepare('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(title, id, userId);
    }
}

export async function updateConversationTopic(id: string, userId: string, topicTag: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query(
            'UPDATE conversations SET topic_tag = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
            [topicTag, id, userId]
        );
    } else {
        getSqlite().prepare('UPDATE conversations SET topic_tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(topicTag, id, userId);
    }
}

export async function deleteConversation(id: string, userId: string, permanent: boolean = false): Promise<void> {
    if (isPostgresActive) {
        if (permanent) {
            await pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
        } else {
            await pool.query('UPDATE conversations SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId]);
        }
    } else {
        if (permanent) {
            getSqlite().prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId);
        } else {
            getSqlite().prepare('UPDATE conversations SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(id, userId);
        }
    }
}

export async function searchConversations(userId: string, query: string, limit: number = 20): Promise<Conversation[]> {
    const searchTerm = `%${query}%`;
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT * FROM conversations WHERE user_id = $1 AND (title ILIKE $2 OR topic_tag ILIKE $2) AND is_deleted = FALSE ORDER BY updated_at DESC LIMIT $3',
            [userId, searchTerm, limit]
        );
        return result.rows;
    } else {
        return getSqlite().prepare(
            'SELECT * FROM conversations WHERE user_id = ? AND (title LIKE ? OR topic_tag LIKE ?) AND is_deleted = 0 ORDER BY updated_at DESC LIMIT ?'
        ).all(userId, searchTerm, searchTerm, limit) as Conversation[];
    }
}

// ──────────────────────────── Messages ────────────────────────────

export async function addMessage(
    conversationId: string,
    role: 'user' | 'nova',
    content: string,
    metadata: object | null = null
): Promise<Message> {
    if (isPostgresActive) {
        const result = await pool.query(
            'INSERT INTO messages (conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
            [conversationId, role, content, metadata]
        );
        await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
        return result.rows[0];
    } else {
        const db = getSqlite();
        const id = uuidv4();
        db.prepare(
            'INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)'
        ).run(id, conversationId, role, content, metadata ? JSON.stringify(metadata) : null);
        db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conversationId);
        return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
    }
}

export async function getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
            [conversationId, limit]
        );
        return result.rows;
    } else {
        const rows = getSqlite().prepare(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?'
        ).all(conversationId, limit) as any[];
        return rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
    }
}

export async function getRecentMemoryContext(conversationId: string, limit: number = 10): Promise<string> {
    const messages = await getMessages(conversationId, limit);
    if (messages.length === 0) return 'No previous memory context available.';

    return messages
        .map(m => {
            const time = new Date(m.created_at).toLocaleTimeString();
            return `[${time}] ${m.role.toUpperCase()}: ${m.content}`;
        })
        .join('\n');
}

export async function getMessagesByDateRange(startDate: Date, endDate: Date): Promise<Message[]> {
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT * FROM messages WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at ASC',
            [startDate, endDate]
        );
        return result.rows;
    } else {
        const rows = getSqlite().prepare(
            'SELECT * FROM messages WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?) ORDER BY created_at ASC'
        ).all(startDate.toISOString(), endDate.toISOString()) as any[];
        return rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
    }
}
// ──────────────────────────── Trend Analyses ────────────────────────────

export async function saveTrendAnalysis(
    userId: string,
    topic: string,
    analysis: TrendData,
    score: number
): Promise<TrendAnalysis> {
    if (isPostgresActive) {
        const result = await pool.query(
            'INSERT INTO trend_analyses (user_id, topic, analysis, score) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, topic, analysis, score]
        );
        return result.rows[0];
    } else {
        const db = getSqlite();
        const id = uuidv4();
        db.prepare(
            'INSERT INTO trend_analyses (id, user_id, topic, analysis, score) VALUES (?, ?, ?, ?, ?)'
        ).run(id, userId, topic, JSON.stringify(analysis), score);
        const row = db.prepare('SELECT * FROM trend_analyses WHERE id = ?').get(id) as any;
        return { ...row, analysis: JSON.parse(row.analysis) };
    }
}

export async function getTrendAnalyses(userId: string, limit: number = 20): Promise<TrendAnalysis[]> {
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT * FROM trend_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [userId, limit]
        );
        return result.rows;
    } else {
        const rows = getSqlite().prepare('SELECT * FROM trend_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[];
        return rows.map(r => ({ ...r, analysis: JSON.parse(r.analysis) }));
    }
}

// ──────────────────────────── Agent Network ────────────────────────────

export async function addAgent(
    name: string,
    description: string,
    capabilities: string[]
): Promise<Agent> {
    if (isPostgresActive) {
        const result = await pool.query(
            'INSERT INTO agent_network (name, description, capabilities) VALUES ($1, $2, $3) RETURNING *',
            [name, description, capabilities]
        );
        return result.rows[0];
    } else {
        const db = getSqlite();
        const id = uuidv4();
        db.prepare(
            'INSERT INTO agent_network (id, name, description, capabilities) VALUES (?, ?, ?, ?)'
        ).run(id, name, description, JSON.stringify(capabilities));
        const row = db.prepare('SELECT * FROM agent_network WHERE id = ?').get(id) as any;
        return { ...row, capabilities: JSON.parse(row.capabilities) };
    }
}

export async function getAgents(): Promise<Agent[]> {
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT * FROM agent_network ORDER BY trust_score DESC'
        );
        return result.rows;
    } else {
        const rows = getSqlite().prepare('SELECT * FROM agent_network ORDER BY trust_score DESC').all() as any[];
        return rows.map(r => ({ ...r, capabilities: JSON.parse(r.capabilities) }));
    }
}

export async function updateAgentTrustScore(id: string, trustScore: number): Promise<void> {
    if (isPostgresActive) {
        await pool.query('UPDATE agent_network SET trust_score = $1 WHERE id = $2', [trustScore, id]);
    } else {
        getSqlite().prepare('UPDATE agent_network SET trust_score = ? WHERE id = ?').run(trustScore, id);
    }
}

export async function updateAgentStatus(id: string, status: 'active' | 'inactive' | 'flagged'): Promise<void> {
    if (isPostgresActive) {
        await pool.query('UPDATE agent_network SET status = $1 WHERE id = $2', [status, id]);
    } else {
        getSqlite().prepare('UPDATE agent_network SET status = ? WHERE id = ?').run(status, id);
    }
}

export async function updateAgentCollaboration(id: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query('UPDATE agent_network SET last_collaboration = NOW() WHERE id = $1', [id]);
    } else {
        getSqlite().prepare('UPDATE agent_network SET last_collaboration = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    }
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
}): Promise<void> {
    if (isPostgresActive) {
        await pool.query(
            'INSERT INTO intelligence_raids (user_id, category, risk_level, source_platform, content, summary, tags, metadata, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [userId, raid.category, raid.risk_level, raid.source_platform, raid.content, raid.summary, raid.tags, raid.metadata || null, raid.ride_type || 'mid-week', raid.opportunity_score || 0, raid.status || 'active']
        );
    } else {
        const id = uuidv4();
        getSqlite().prepare(
            'INSERT INTO intelligence_raids (id, user_id, category, risk_level, source_platform, content, summary, tags, metadata, ride_type, opportunity_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            id,
            userId,
            raid.category,
            raid.risk_level,
            raid.source_platform,
            raid.content,
            raid.summary,
            JSON.stringify(raid.tags),
            raid.metadata ? JSON.stringify(raid.metadata) : null,
            raid.ride_type || 'mid-week',
            raid.opportunity_score || 0,
            raid.status || 'active'
        );
    }
}

export async function getRaidResults(userId: string, limit: number = 50): Promise<any[]> {
    if (isPostgresActive) {
        const result = await pool.query('SELECT * FROM intelligence_raids WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
        return result.rows;
    } else {
        const rows = getSqlite().prepare('SELECT * FROM intelligence_raids WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[];
        return rows.map(r => ({ ...r, tags: JSON.parse(r.tags), metadata: r.metadata ? JSON.parse(r.metadata) : null }));
    }
}

export async function deleteRaidResult(id: string, userId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query('DELETE FROM intelligence_raids WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
        getSqlite().prepare('DELETE FROM intelligence_raids WHERE id = ? AND user_id = ?').run(id, userId);
    }
}

export async function bulkDeleteRaidResults(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    if (isPostgresActive) {
        await pool.query('DELETE FROM intelligence_raids WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
    } else {
        const placeholders = ids.map(() => '?').join(',');
        getSqlite().prepare(`DELETE FROM intelligence_raids WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, userId);
    }
}

export async function saveWeeklyReport(userId: string, report: {
    report_data: object;
    period_start: Date;
    period_end: Date;
    ride_type?: 'mid-week' | 'end-week' | 'emergency';
    opportunity_score?: number;
    status?: 'active' | 'archived' | 'deleted';
}): Promise<void> {
    if (isPostgresActive) {
        await pool.query(
            'INSERT INTO weekly_reports (user_id, report_data, period_start, period_end, ride_type, opportunity_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, report.report_data, report.period_start, report.period_end, report.ride_type || 'end-week', report.opportunity_score || 0, report.status || 'active']
        );
    } else {
        const id = uuidv4();
        getSqlite().prepare(
            'INSERT INTO weekly_reports (id, user_id, report_data, period_start, period_end, ride_type, opportunity_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(id, userId, JSON.stringify(report.report_data), report.period_start.toISOString(), report.period_end.toISOString(), report.ride_type || 'end-week', report.opportunity_score || 0, report.status || 'active');
    }
}

export async function getWeeklyReports(userId: string, limit: number = 20): Promise<any[]> {
    if (isPostgresActive) {
        const result = await pool.query("SELECT * FROM weekly_reports WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT $2", [userId, limit]);
        return result.rows;
    } else {
        const rows = getSqlite().prepare("SELECT * FROM weekly_reports WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT ?").all(userId, limit) as any[];
        return rows.map(r => ({ ...r, report_data: JSON.parse(r.report_data) }));
    }
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
        if (isPostgresActive) {
            query += ` AND report_data->>'report_data' ILIKE $${paramIdx++}`;
        } else {
            query += ` AND json_extract(report_data, '$.report_data') LIKE $${paramIdx++}`;
        }
        params.push(`%${filters.topic}%`);
    }
    if (filters.risk_level) {
        if (isPostgresActive) {
            query += ` AND report_data->>'report_data' ILIKE $${paramIdx++}`;
        } else {
            query += ` AND json_extract(report_data, '$.report_data') LIKE $${paramIdx++}`;
        }
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

    if (isPostgresActive) {
        const result = await pool.query(query, params);
        return result.rows;
    } else {
        const sqliteQuery = query.replace(/\$\d+/g, '?');
        const rows = getSqlite().prepare(sqliteQuery).all(...params) as any[];
        return rows.map(r => ({ ...r, report_data: JSON.parse(r.report_data) }));
    }
}

export async function softDeleteReport(id: string, userId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query("UPDATE weekly_reports SET status = 'archived' WHERE id = $1 AND user_id = $2", [id, userId]);
    } else {
        getSqlite().prepare("UPDATE weekly_reports SET status = 'archived' WHERE id = ? AND user_id = ?").run(id, userId);
    }
}

export async function permanentDeleteReport(id: string, userId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query("DELETE FROM weekly_reports WHERE id = $1 AND user_id = $2", [id, userId]);
    } else {
        getSqlite().prepare("DELETE FROM weekly_reports WHERE id = ? AND user_id = ?").run(id, userId);
    }
}

export async function bulkDeleteReports(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    if (isPostgresActive) {
        await pool.query('DELETE FROM weekly_reports WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
    } else {
        const placeholders = ids.map(() => '?').join(',');
        getSqlite().prepare(`DELETE FROM weekly_reports WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, userId);
    }
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
    if (isPostgresActive) {
        const result = await pool.query(
            'INSERT INTO notifications (user_id, title, category, risk_level, monetization_potential, content, priority, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [userId, data.title, data.category, data.risk_level, data.monetization_potential, data.content, data.priority, data.metadata || null]
        );
        return result.rows[0];
    } else {
        const db = getSqlite();
        const id = uuidv4();
        db.prepare(
            'INSERT INTO notifications (id, user_id, title, category, risk_level, monetization_potential, content, priority, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(id, userId, data.title, data.category, data.risk_level, data.monetization_potential, data.content, data.priority, data.metadata ? JSON.stringify(data.metadata) : null);
        return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    }
}

export async function getNotifications(userId: string, limit: number = 30, includeRead: boolean = true): Promise<any[]> {
    const readFilter = includeRead ? '' : (isPostgresActive ? 'AND is_read = FALSE' : 'AND is_read = 0');
    const archivedFilter = isPostgresActive ? 'AND is_archived = FALSE' : 'AND is_archived = 0';

    if (isPostgresActive) {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ${readFilter} ${archivedFilter} ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    } else {
        return getSqlite().prepare(
            `SELECT * FROM notifications WHERE user_id = ? ${readFilter} ${archivedFilter} ORDER BY created_at DESC LIMIT ?`
        ).all(userId, limit) as any[];
    }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
    if (isPostgresActive) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE',
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    } else {
        const result = getSqlite().prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_archived = 0'
        ).get(userId) as any;
        return result.count;
    }
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
        getSqlite().prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }
}

export async function archiveNotification(id: string, userId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query('UPDATE notifications SET is_archived = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
        getSqlite().prepare('UPDATE notifications SET is_archived = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }
}

// ──────────────────────────── Push Subscriptions ────────────────────────────

export async function savePushSubscription(userId: string, deviceId: string, subscription: any): Promise<void> {
    const subscriptionData = JSON.stringify(subscription);
    if (isPostgresActive) {
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, device_id, subscription_data) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (device_id) DO UPDATE SET subscription_data = $3`,
            [userId, deviceId, subscriptionData]
        );
    } else {
        const db = getSqlite();
        const existing = db.prepare('SELECT id FROM push_subscriptions WHERE device_id = ?').get(deviceId) as any;
        if (existing) {
            db.prepare('UPDATE push_subscriptions SET subscription_data = ? WHERE device_id = ?').run(subscriptionData, deviceId);
        } else {
            const id = uuidv4();
            db.prepare('INSERT INTO push_subscriptions (id, user_id, device_id, subscription_data) VALUES (?, ?, ?, ?)').run(id, userId, deviceId, subscriptionData);
        }
    }
}

export async function getPushSubscriptions(userId: string): Promise<any[]> {
    if (isPostgresActive) {
        const result = await pool.query('SELECT subscription_data FROM push_subscriptions WHERE user_id = $1', [userId]);
        return result.rows.map((r: any) => r.subscription_data);
    } else {
        const results = getSqlite().prepare('SELECT subscription_data FROM push_subscriptions WHERE user_id = ?').all(userId) as any[];
        return results.map(r => JSON.parse(r.subscription_data));
    }
}

export async function deletePushSubscription(deviceId: string): Promise<void> {
    if (isPostgresActive) {
        await pool.query('DELETE FROM push_subscriptions WHERE device_id = $1', [deviceId]);
    } else {
        getSqlite().prepare('DELETE FROM push_subscriptions WHERE device_id = ?').run(deviceId);
    }
}

export async function updateDeviceNotificationStatus(deviceId: string, enabled: boolean): Promise<void> {
    const val = isPostgresActive ? enabled : (enabled ? 1 : 0);
    if (isPostgresActive) {
        await pool.query('UPDATE devices SET notifications_enabled = $1 WHERE id = $2', [val, deviceId]);
    } else {
        getSqlite().prepare('UPDATE devices SET notifications_enabled = ? WHERE id = ?').run(val, deviceId);
    }
}

export async function logAgentActivity(action: {
    agent_id?: string;
    action_type: string;
    platform?: string;
    details: string;
    metadata?: object;
}): Promise<void> {
    if (isPostgresActive) {
        await pool.query(
            'INSERT INTO agent_activity_logs (agent_id, action_type, platform, details, metadata) VALUES ($1, $2, $3, $4, $5)',
            [action.agent_id || 'ZIUM_NOVA', action.action_type, action.platform || 'INTERNAL', action.details, action.metadata || null]
        );
    } else {
        const id = uuidv4();
        getSqlite().prepare(
            'INSERT INTO agent_activity_logs (id, agent_id, action_type, platform, details, metadata) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, action.agent_id || 'ZIUM_NOVA', action.action_type, action.platform || 'INTERNAL', action.details, action.metadata ? JSON.stringify(action.metadata) : null);
    }
}
