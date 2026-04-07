import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditUsage() {
    console.log('\n--- ZIUM NOVA AI USAGE AUDIT ---');
    try {
        // 1. Total Requests Today
        const requestsToday = await pool.query(`
            SELECT count(*) FROM messages 
            WHERE role = 'nova' 
            AND created_at >= CURRENT_DATE
        `);
        console.log(`\nRequests Today: ${requestsToday.rows[0].count}`);

        // 2. Token Breakdown by Model
        const usageRes = await pool.query(`
            SELECT 
                metadata->>'model' as model,
                count(*) as requests,
                SUM(CAST(metadata->'usage'->>'total_tokens' AS INTEGER)) as total_tokens
            FROM messages 
            WHERE role = 'nova' 
            AND metadata->'usage'->>'total_tokens' IS NOT NULL
            AND created_at >= CURRENT_DATE
            GROUP BY 1
        `);

        if (usageRes.rows.length === 0) {
            console.log('No token data found for today yet.');
        } else {
            console.log('\nToken Usage Breakdown (Today):');
            console.table(usageRes.rows);
        }

        // 3. Estimated Cost (Groq is free, but let's assume standard Llama 3 rates for comparison)
        const totalTokens = usageRes.rows.reduce((sum, row) => sum + parseInt(row.total_tokens || 0), 0);
        console.log(`\nTotal Tokens Consumed: ${totalTokens}`);
        console.log(`Estimated Cost Savings (using Free Tier): $${(totalTokens / 1000000 * 0.15).toFixed(4)}`);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await pool.end();
    }
}

auditUsage();
