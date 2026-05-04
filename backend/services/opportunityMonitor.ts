import { pool } from '../db/connection.js';

export const scanSignals = async (source: string) => {
    // Mock fetching external signals
    console.log(`Scanning signals from ${source}...`);
    return [];
};

export const detectOpportunity = async (
    userId: string,
    title: string,
    category: 'freelance' | 'collaboration' | 'platform trends' | 'software demand' | 'partnerships' | 'ecosystem signals',
    source: string,
    score: number,
    estimatedReward: number,
    estimatedEffort: string,
    recommendedAction: string
) => {
    const query = `
        INSERT INTO opportunities (user_id, title, category, source, score, estimated_reward, estimated_effort, recommended_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
    `;
    const result = await pool.query(query, [userId, title, category, source, score, estimatedReward, estimatedEffort, recommendedAction]);
    return result.rows[0];
};

export const rankOpportunity = async (userId: string) => {
    const query = `
        SELECT * FROM opportunities 
        WHERE user_id = $1 AND status IN ('NEW', 'REVIEWING')
        ORDER BY score DESC, estimated_reward DESC
        LIMIT 10;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};
