import { pool } from '../db/connection';

export const runWorkflow = async (userId: string, goal: string, metadata: any = {}) => {
    const query = `
        INSERT INTO automation_runs (user_id, goal, metadata, status)
        VALUES ($1, $2, $3, 'RUNNING')
        RETURNING *;
    `;
    const result = await pool.query(query, [userId, goal, metadata]);
    return result.rows[0];
};

export const retryFailedStep = async (runId: string) => {
    const query = `
        UPDATE automation_runs 
        SET status = 'RETRYING', updated_at = NOW() 
        WHERE id = $1 AND status = 'FAILED'
        RETURNING *;
    `;
    const result = await pool.query(query, [runId]);
    return result.rows[0];
};

export const resumeWorkflow = async (runId: string) => {
    const query = `
        UPDATE automation_runs 
        SET status = 'RUNNING', updated_at = NOW() 
        WHERE id = $1 AND status = 'PAUSED'
        RETURNING *;
    `;
    const result = await pool.query(query, [runId]);
    return result.rows[0];
};

export const cancelWorkflow = async (runId: string) => {
    const query = `
        UPDATE automation_runs 
        SET status = 'CANCELLED', updated_at = NOW() 
        WHERE id = $1
        RETURNING *;
    `;
    const result = await pool.query(query, [runId]);
    return result.rows[0];
};
