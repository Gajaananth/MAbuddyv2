import { pool } from '../db/connection.js';
export const scanSignals = async (source) => {
    // Mock fetching external signals
    console.log(`Scanning signals from ${source}...`);
    return [];
};
export const detectOpportunity = async (userId, title, category, source, score, estimatedReward, estimatedEffort, recommendedAction) => {
    const query = `
        INSERT INTO opportunities (user_id, title, category, source, score, estimated_reward, estimated_effort, recommended_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
    `;
    const result = await pool.query(query, [userId, title, category, source, score, estimatedReward, estimatedEffort, recommendedAction]);
    return result.rows[0];
};
export const rankOpportunity = async (userId) => {
    const query = `
        SELECT * FROM opportunities 
        WHERE user_id = $1 AND status IN ('NEW', 'REVIEWING')
        ORDER BY score DESC, estimated_reward DESC
        LIMIT 10;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};
