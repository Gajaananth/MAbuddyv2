import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function fixDatabase() {
    await initDatabase();
    console.log('--- DATABASE CLEANUP START ---');

    if (isPostgresActive) {
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

    } else if (sqliteDb) {
        // SQLite Fixes
        const emptyStmt = sqliteDb.prepare('DELETE FROM conversations WHERE id NOT IN (SELECT conversation_id FROM messages)');
        const emptyInfo = emptyStmt.run();
        console.log(`SQLite: Removed ${emptyInfo.changes} empty conversations.`);

        // De-duplicate messages
        const dupStmt = sqliteDb.prepare(`
            DELETE FROM messages 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM messages 
                GROUP BY conversation_id, content
            )
        `);
        const dupInfo = dupStmt.run();
        console.log(`SQLite: De-duplicated ${dupInfo.changes} messages.`);
    }

    console.log('--- DATABASE CLEANUP END ---');
    process.exit(0);
}

fixDatabase();
