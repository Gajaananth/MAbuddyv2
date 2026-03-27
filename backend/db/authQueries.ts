import db from './connection.js';

export async function getUserCount(): Promise<number> {
    const result = await db.pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
}

export async function getDeviceCount(): Promise<number> {
    const result = await db.pool.query('SELECT COUNT(*) FROM devices');
    return parseInt(result.rows[0].count, 10);
}

export async function getUserById(id: string): Promise<any | null> {
    const result = await db.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
}

export async function createUser(u: {
    dob_hash: string;
    pin_hash: string;
    q1_hash: string;
    q2_hash: string;
    q3_hash: string;
}): Promise<any> {
    const result = await db.pool.query(
        'INSERT INTO users (dob_hash, pin_hash, q1_hash, q2_hash, q3_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [u.dob_hash, u.pin_hash, u.q1_hash, u.q2_hash, u.q3_hash]
    );
    return result.rows[0];
}

export async function getUserByPin(pinHash: string): Promise<any | null> {
    const result = await db.pool.query('SELECT * FROM users');
    return result.rows;
}

export async function getAllUsers(): Promise<any[]> {
    const result = await db.pool.query('SELECT * FROM users');
    return result.rows;
}

export async function findUserByIdentifiers(u: {
    dob_hash: string;
    q1_hash: string;
    q2_hash: string;
    q3_hash: string;
}): Promise<any | null> {
    const result = await db.pool.query(
        'SELECT * FROM users WHERE dob_hash = $1 AND q1_hash = $2 AND q2_hash = $3 AND q3_hash = $4',
        [u.dob_hash, u.q1_hash, u.q2_hash, u.q3_hash]
    );
    return result.rows[0] || null;
}

export async function findUserByDobHash(dobHash: string): Promise<any | null> {
    const result = await db.pool.query('SELECT * FROM users WHERE dob_hash = $1', [dobHash]);
    return result.rows[0] || null;
}

export async function updateFailedAttempts(userId: string, count: number, lockUntil: Date | null): Promise<void> {
    await db.pool.query(
        'UPDATE users SET failed_attempts = $1, lock_until = $2 WHERE id = $3',
        [count, lockUntil, userId]
    );
}

export async function resetFailedAttempts(userId: string): Promise<void> {
    await db.pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = $1', [userId]);
}

export async function updatePin(userId: string, pinHash: string): Promise<void> {
    await db.pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, userId]);
}

// ──────────────────────────── Devices ────────────────────────────

export async function registerDevice(d: {
    user_id: string;
    device_identifier: string;
    fingerprint: string;
    os_type: string;
}): Promise<void> {
    await db.pool.query(
        'INSERT INTO devices (user_id, device_identifier, fingerprint, os_type) VALUES ($1, $2, $3, $4)',
        [d.user_id, d.device_identifier, d.fingerprint, d.os_type]
    );
}

export async function getDevicesByUserId(userId: string): Promise<any[]> {
    const result = await db.pool.query('SELECT * FROM devices WHERE user_id = $1', [userId]);
    return result.rows;
}

export async function getDeviceCountByUserId(userId: string): Promise<number> {
    const result = await db.pool.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [userId]);
    return parseInt(result.rows[0].count, 10);
}

export async function findDevice(userId: string, fingerprint: string): Promise<any | null> {
    const result = await db.pool.query(
        'SELECT * FROM devices WHERE user_id = $1 AND fingerprint = $2',
        [userId, fingerprint]
    );
    return result.rows[0] || null;
}

export async function getDeviceByIdentifierAndFingerprint(identifier: string, fingerprint: string): Promise<any | null> {
    const result = await db.pool.query(
        'SELECT * FROM devices WHERE device_identifier = $1 AND fingerprint = $2',
        [identifier, fingerprint]
    );
    return result.rows[0] || null;
}


export async function updateWebAuthn(deviceId: string, publicKey: string, credentialId: string, counter: number): Promise<void> {
    await db.pool.query(
        'UPDATE devices SET public_key = $1, credential_id = $2, counter = $3 WHERE id = $4',
        [publicKey, credentialId, counter, deviceId]
    );
}


export async function updateChallenge(deviceId: string, challenge: string): Promise<void> {
    await db.pool.query('UPDATE devices SET current_challenge = $1 WHERE id = $2', [challenge, deviceId]);
}

export async function getChallenge(deviceId: string): Promise<string | null> {
    const result = await db.pool.query('SELECT current_challenge FROM devices WHERE id = $1', [deviceId]);
    return result.rows[0]?.current_challenge || null;
}

export async function removeDevice(deviceId: string, userId: string): Promise<void> {
    await db.pool.query('DELETE FROM devices WHERE id = $1 AND user_id = $2', [deviceId, userId]);
}

const authQueries = {
    getAllUsers,
    getUserCount,
    getUserById,
    findUserByIdentifiers,
    getUserByPin,
    createUser,
    registerDevice,
    findDevice,
    getDevicesByUserId,
    getDeviceCountByUserId,
    getDeviceByIdentifierAndFingerprint,
    getDeviceCount,
    removeDevice,
    updateWebAuthn,
    updatePin,
    updateFailedAttempts,
    resetFailedAttempts,
    updateChallenge,
    getChallenge
};

export default authQueries;

