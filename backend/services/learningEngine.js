import { pool } from '../db/connection.js';
export const recordOutcome = async (userId, actionType, outcome, score, notes, context = {}) => {
    const query = `
        INSERT INTO learning_events (user_id, action_type, outcome, score, notes, context)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
    `;
    const result = await pool.query(query, [userId, actionType, outcome, score, notes, JSON.stringify(context)]);
    return result.rows[0];
};
export const analyzePatterns = async (userId, actionType) => {
    let query = `SELECT outcome, count(*) as count, avg(score) as avg_score FROM learning_events WHERE user_id = $1`;
    const params = [userId];
    if (actionType) {
        query += ` AND action_type = $2`;
        params.push(actionType);
    }
    query += ` GROUP BY outcome ORDER BY count DESC`;
    const result = await pool.query(query, params);
    return result.rows;
};
export const suggestImprovements = async (userId) => {
    // Retrieve patterns to suggest improvements
    const patterns = await analyzePatterns(userId);
    let suggestion = "Keep evaluating outcomes.";
    const failures = patterns.find(p => p.outcome === 'FAILURE');
    if (failures && failures.count > 5) {
        suggestion = "High failure rate detected. Consider reviewing recent strategies.";
    }
    return { suggestion, patterns };
};
