import { pool, initDatabase } from './db/connection';

async function fixDatabase() {
    await initDatabase();
    console.log('--- DATABASE CLEANUP START ---');

    // Postgres Fixes
    const emptyConvs = await pool.query('DELETE FROM conversations WHERE id NOT IN (SELECT conversation_id FROM messages)');
    console.log(`Postgres: Removed ${emptyConvs.rowCount} empty conversations.`);

    // De-duplicate messages (keep earliest per content/convo_id)
    const dupFix = await pool.query(`
        DELETE FROM messages a USING messages b 
        WHERE a.id > b.id 
        AND a.conversation_id = b.conversation_id 
        AND a.content = b.content
    `);
    console.log(`Postgres: De-duplicated ${dupFix.rowCount} messages.`);

    console.log('--- DATABASE CLEANUP END ---');
    process.exit(0);
}

fixDatabase();
