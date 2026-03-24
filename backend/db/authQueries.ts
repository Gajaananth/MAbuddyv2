import * as db from './connection.js';
import { v4 as uuidv4 } from 'uuid';

function getSqlite() {
    if (!db.sqliteDb) throw new Error('Database unavailable.');
    return db.sqliteDb;
}

export async function getUserCount(): Promise<number> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT COUNT(*) FROM users');
        return parseInt(result.rows[0].count, 10);
    } else {
        const result = getSqlite().prepare('SELECT COUNT(*) as count FROM users').get() as any;
        return result.count;
    }
}

export async function getDeviceCount(): Promise<number> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT COUNT(*) FROM devices');
        return parseInt(result.rows[0].count, 10);
    } else {
        const result = getSqlite().prepare('SELECT COUNT(*) as count FROM devices').get() as any;
        return result.count;
    }
}

export async function createUser(u: {
    dob_hash: string;
    pin_hash: string;
    q1_hash: string;
    q2_hash: string;
    q3_hash: string;
}): Promise<any> {
    if (db.isPostgresActive) {
        const result = await db.pool.query(
            'INSERT INTO users (dob_hash, pin_hash, q1_hash, q2_hash, q3_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [u.dob_hash, u.pin_hash, u.q1_hash, u.q2_hash, u.q3_hash]
        );
        return result.rows[0];
    } else {
        const id = uuidv4();
        getSqlite().prepare(
            'INSERT INTO users (id, dob_hash, pin_hash, q1_hash, q2_hash, q3_hash) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, u.dob_hash, u.pin_hash, u.q1_hash, u.q2_hash, u.q3_hash);
        return getSqlite().prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
}

export async function getUserByPin(pinHash: string): Promise<any | null> {
    // This is used to find a user by their PIN hash.
    // However, since we don't have usernames, the current login flow fetches all users
    // and checks the PIN hash manually.
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT * FROM users');
        return result.rows;
    } else {
        return getSqlite().prepare('SELECT * FROM users').all();
    }
}

export async function getAllUsers(): Promise<any[]> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT * FROM users');
        return result.rows;
    } else {
        return getSqlite().prepare('SELECT * FROM users').all() as any[];
    }
}

export async function findUserByIdentifiers(u: {
    dob_hash: string;
    q1_hash: string;
    q2_hash: string;
    q3_hash: string;
}): Promise<any | null> {
    if (db.isPostgresActive) {
        const result = await db.pool.query(
            'SELECT * FROM users WHERE dob_hash = $1 AND q1_hash = $2 AND q2_hash = $3 AND q3_hash = $4',
            [u.dob_hash, u.q1_hash, u.q2_hash, u.q3_hash]
        );
        return result.rows[0] || null;
    } else {
        return getSqlite().prepare(
            'SELECT * FROM users WHERE dob_hash = ? AND q1_hash = ? AND q2_hash = ? AND q3_hash = ?'
        ).get(u.dob_hash, u.q1_hash, u.q2_hash, u.q3_hash) || null;
    }
}

export async function findUserByDobHash(dobHash: string): Promise<any | null> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT * FROM users WHERE dob_hash = $1', [dobHash]);
        return result.rows[0] || null;
    } else {
        return getSqlite().prepare('SELECT * FROM users WHERE dob_hash = ?').get(dobHash) || null;
    }
}

export async function updateFailedAttempts(userId: string, count: number, lockUntil: Date | null): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query(
            'UPDATE users SET failed_attempts = $1, lock_until = $2 WHERE id = $3',
            [count, lockUntil, userId]
        );
    } else {
        getSqlite().prepare(
            'UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?'
        ).run(count, lockUntil ? lockUntil.toISOString() : null, userId);
    }
}

export async function resetFailedAttempts(userId: string): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = $1', [userId]);
    } else {
        getSqlite().prepare('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?').run(userId);
    }
}

export async function updatePin(userId: string, pinHash: string): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, userId]);
    } else {
        getSqlite().prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pinHash, userId);
    }
}

// ──────────────────────────── Devices ────────────────────────────

export async function registerDevice(d: {
    user_id: string;
    device_identifier: string;
    fingerprint: string;
    os_type: string;
}): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query(
            'INSERT INTO devices (user_id, device_identifier, fingerprint, os_type) VALUES ($1, $2, $3, $4)',
            [d.user_id, d.device_identifier, d.fingerprint, d.os_type]
        );
    } else {
        const id = uuidv4();
        getSqlite().prepare(
            'INSERT INTO devices (id, user_id, device_identifier, fingerprint, os_type) VALUES (?, ?, ?, ?, ?)'
        ).run(id, d.user_id, d.device_identifier, d.fingerprint, d.os_type);
    }
}

export async function getDevicesByUserId(userId: string): Promise<any[]> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT * FROM devices WHERE user_id = $1', [userId]);
        return result.rows;
    } else {
        return getSqlite().prepare('SELECT * FROM devices WHERE user_id = ?').all(userId) as any[];
    }
}

export async function getDeviceCountByUserId(userId: string): Promise<number> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [userId]);
        return parseInt(result.rows[0].count, 10);
    } else {
        const result = getSqlite().prepare('SELECT COUNT(*) as count FROM devices WHERE user_id = ?').get(userId) as any;
        return result.count;
    }
}

export async function findDevice(userId: string, fingerprint: string): Promise<any | null> {
    if (db.isPostgresActive) {
        const result = await db.pool.query(
            'SELECT * FROM devices WHERE user_id = $1 AND fingerprint = $2',
            [userId, fingerprint]
        );
        return result.rows[0] || null;
    } else {
        return getSqlite().prepare(
            'SELECT * FROM devices WHERE user_id = ? AND fingerprint = ?'
        ).get(userId, fingerprint) || null;
    }
}

export async function getDeviceByIdentifierAndFingerprint(identifier: string, fingerprint: string): Promise<any | null> {
    if (db.isPostgresActive) {
        const result = await db.pool.query(
            'SELECT * FROM devices WHERE device_identifier = $1 AND fingerprint = $2',
            [identifier, fingerprint]
        );
        return result.rows[0] || null;
    } else {
        return getSqlite().prepare(
            'SELECT * FROM devices WHERE device_identifier = ? AND fingerprint = ?'
        ).get(identifier, fingerprint) || null;
    }
}


export async function updateWebAuthn(deviceId: string, publicKey: string, credentialId: string, counter: number): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query(
            'UPDATE devices SET public_key = $1, credential_id = $2, counter = $3 WHERE id = $4',
            [publicKey, credentialId, counter, deviceId]
        );
    } else {
        getSqlite().prepare(
            'UPDATE devices SET public_key = ?, credential_id = ?, counter = ? WHERE id = ?'
        ).run(publicKey, credentialId, counter, deviceId);
    }
}


export async function updateChallenge(deviceId: string, challenge: string): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query('UPDATE devices SET current_challenge = $1 WHERE id = $2', [challenge, deviceId]);
    } else {
        getSqlite().prepare('UPDATE devices SET current_challenge = ? WHERE id = ?').run(challenge, deviceId);
    }
}

export async function getChallenge(deviceId: string): Promise<string | null> {
    if (db.isPostgresActive) {
        const result = await db.pool.query('SELECT current_challenge FROM devices WHERE id = $1', [deviceId]);
        return result.rows[0]?.current_challenge || null;
    } else {
        const result = getSqlite().prepare('SELECT current_challenge FROM devices WHERE id = ?').get(deviceId) as any;
        return result?.current_challenge || null;
    }
}

export async function removeDevice(deviceId: string, userId: string): Promise<void> {
    if (db.isPostgresActive) {
        await db.pool.query('DELETE FROM devices WHERE id = $1 AND user_id = $2', [deviceId, userId]);
    } else {
        getSqlite().prepare('DELETE FROM devices WHERE id = ? AND user_id = ?').run(deviceId, userId);
    }
}

