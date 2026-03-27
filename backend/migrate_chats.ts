import { pool, initDatabase } from './db/connection';

async function migrateChats() {
    await initDatabase();

    const targetUserId = 'e0be1f6d-eb99-4325-a331-24a41938c692';

    const res = await pool.query(
        "UPDATE conversations SET user_id = $1 WHERE user_id = 'default_user'",
        [targetUserId]
    );
    console.log(`PostgreSQL: Migrated ${res.rowCount} conversations.`);
    process.exit(0);
}

migrateChats();
