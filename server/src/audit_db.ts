import { pool, sqliteDb, isPostgresActive, initDatabase } from './db/connection';

async function auditDatabase() {
    await initDatabase();
    console.log('--- DATABASE AUDIT START ---');

    if (isPostgresActive) {
        // Postgres Checks
        const orphans = await pool.query('SELECT count(*) FROM messages WHERE conversation_id NOT IN (SELECT id FROM conversations)');
        console.log('Orphaned Messages (Postgres):', orphans.rows[0].count);

        const dupDevices = await pool.query('SELECT user_id, device_identifier, count(*) FROM devices GROUP BY user_id, device_identifier HAVING count(*) > 1');
        console.log('Duplicate Device Registrations (Postgres):', dupDevices.rows);

        const dupUsers = await pool.query('SELECT pin_hash, dob_hash, count(*) FROM users GROUP BY pin_hash, dob_hash HAVING count(*) > 1');
        console.log('Potential Duplicate Users (Postgres):', dupUsers.rows);

        const dupRaids = await pool.query("SELECT content, count(*) FROM intelligence_raids GROUP BY content HAVING count(*) > 1");
        console.log('Duplicate Intelligence Raids (Postgres):', dupRaids.rows.length);

        const dupFingerprints = await pool.query('SELECT user_id, fingerprint, count(*) FROM devices GROUP BY user_id, fingerprint HAVING count(*) > 1');
        console.log('Fingerprint Overlap (Postgres):', dupFingerprints.rows);

    } else if (sqliteDb) {
        // SQLite Checks
        const orphans = sqliteDb.prepare('SELECT count(*) as count FROM messages WHERE conversation_id NOT IN (SELECT id FROM conversations)').get() as any;
        console.log('Orphaned Messages (SQLite):', orphans.count);

        const dupDevices = sqliteDb.prepare('SELECT user_id, device_identifier, count(*) as count FROM devices GROUP BY user_id, device_identifier HAVING count > 1').all();
        console.log('Duplicate Device Registrations (SQLite):', dupDevices);

        const dupUsers = sqliteDb.prepare('SELECT pin_hash, dob_hash, count(*) as count FROM users GROUP BY pin_hash, dob_hash HAVING count > 1').all();
        console.log('Potential Duplicate Users (SQLite):', dupUsers);

        const emptyConvs = sqliteDb.prepare('SELECT count(*) as count FROM conversations WHERE id NOT IN (SELECT conversation_id FROM messages)').get() as any;
        console.log('Empty Conversations (SQLite):', emptyConvs.count);

        const dupFingerprints = sqliteDb.prepare('SELECT user_id, fingerprint, count(*) as count FROM devices GROUP BY user_id, fingerprint HAVING count > 1').all();
        console.log('Fingerprint Overlap (SQLite):', dupFingerprints);

        const dupMessages = sqliteDb.prepare('SELECT conversation_id, content, count(*) as count FROM messages GROUP BY conversation_id, content HAVING count > 1').all();
        console.log('Redundant Messages in Conversations (SQLite):', dupMessages);
    }

    console.log('--- DATABASE AUDIT END ---');
    process.exit(0);
}

auditDatabase();
