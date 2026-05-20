import dotenv from 'dotenv';
import axios from 'axios';
import { Pool } from 'pg';

dotenv.config();

/**
 * Karuppu DIAGNOSTIC SUITE
 */
async function runDiagnostics() {
    console.log('--- Karuppu BRAIN DIAGNOSTICS ---');
    
    // 1. Check Environment
    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const dbUrl = process.env.DATABASE_URL;

    console.log(`[ENV] GEMINI_API_KEY: ${geminiKey ? 'PRESENT (Length: ' + geminiKey.length + ')' : 'MISSING'}`);
    console.log(`[ENV] OPENROUTER_API_KEY: ${openRouterKey ? 'PRESENT (Length: ' + openRouterKey.length + ')' : 'MISSING'}`);
    console.log(`[ENV] DATABASE_URL: ${dbUrl ? 'PRESENT' : 'MISSING'}`);

    // 2. Test Database Connection
    if (dbUrl) {
        console.log('\n[DB] Testing PostgreSQL Grid...');
        const pool = new Pool({ 
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });
        try {
            const res = await pool.query('SELECT NOW() as now, current_database() as db');
            console.log(`[DB] SUCCESS: Connected to ${res.rows[0].db} at ${res.rows[0].now}`);
            
            const tables = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            console.log(`[DB] Tables found: ${tables.rows.map(t => t.table_name).join(', ')}`);
            
        } catch (err: any) {
            console.error(`[DB] FAILURE: ${err.message}`);
        } finally {
            await pool.end();
        }
    }

    // 3. Test Gemini Connectivity (Tier 1)
    if (geminiKey) {
        console.log('\n[AI] Testing Tier 1 (Gemini Hive)...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`;
        try {
            const res = await axios.post(url, {
                contents: [{ parts: [{ text: 'Respond with the word "CONNECTED"' }] }]
            }, { timeout: 10000 });
            const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`[AI] Gemini Response: ${text?.trim() || 'EMPTY'}`);
        } catch (err: any) {
            console.error(`[AI] Gemini FAILURE: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    // 4. Test OpenRouter Connectivity (Tier 2)
    if (openRouterKey) {
        console.log('\n[AI] Testing Tier 2 (OpenRouter Hive)...');
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: 'Respond with "CONNECTED"' }]
            }, {
                headers: { 
                    'Authorization': `Bearer ${openRouterKey}`,
                    'HTTP-Referer': 'https://ma-buddy.vercel.app',
                    'X-Title': 'Karuppu Diagnostics'
                },
                timeout: 10000
            });
            const text = res.data?.choices?.[0]?.message?.content;
            console.log(`[AI] OpenRouter Response: ${text?.trim() || 'EMPTY'}`);
        } catch (err: any) {
            console.error(`[AI] OpenRouter FAILURE: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

runDiagnostics().catch(console.error);
