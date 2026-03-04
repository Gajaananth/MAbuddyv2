import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function migrateChats() {
    await initDatabase();

    const targetUserId = 'e0be1f6d-eb99-4325-a331-24a41938c692';

    if (isPostgresActive) {
        const res = await pool.query(
            "UPDATE conversations SET user_id = $1 WHERE user_id = 'default_user'",
            [targetUserId]
        );
        console.log(`PostgreSQL: Migrated ${res.rowCount} conversations.`);
    } else if (sqliteDb) {
        const stmt = sqliteDb.prepare("UPDATE conversations SET user_id = ? WHERE user_id = 'default_user'");
        const info = stmt.run(targetUserId);
        console.log(`SQLite: Migrated ${info.changes} conversations.`);
    }
    process.exit(0);
}

migrateChats();
