import db from './connection.js';
export async function getUserCount() {
    const result = await db.pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
}
export async function getDeviceCount() {
    const result = await db.pool.query('SELECT COUNT(*) FROM devices');
    return parseInt(result.rows[0].count, 10);
}
export async function getUserById(id) {
    const result = await db.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
}
export async function createUser(u) {
    const result = await db.pool.query('INSERT INTO users (dob_hash, pin_hash, q1_hash, q2_hash, q3_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *', [u.dob_hash, u.pin_hash, u.q1_hash, u.q2_hash, u.q3_hash]);
    return result.rows[0];
}
export async function getUserByPin(pinHash) {
    const result = await db.pool.query('SELECT * FROM users');
    return result.rows;
}
export async function getAllUsers() {
    const result = await db.pool.query('SELECT * FROM users');
    return result.rows;
}
export async function findUserByIdentifiers(u) {
    const result = await db.pool.query('SELECT * FROM users WHERE dob_hash = $1 AND q1_hash = $2 AND q2_hash = $3 AND q3_hash = $4', [u.dob_hash, u.q1_hash, u.q2_hash, u.q3_hash]);
    return result.rows[0] || null;
}
export async function findUserByDobHash(dobHash) {
    const result = await db.pool.query('SELECT * FROM users WHERE dob_hash = $1', [dobHash]);
    return result.rows[0] || null;
}
export async function updateFailedAttempts(userId, count, lockUntil) {
    await db.pool.query('UPDATE users SET failed_attempts = $1, lock_until = $2 WHERE id = $3', [count, lockUntil, userId]);
}
export async function resetFailedAttempts(userId) {
    await db.pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = $1', [userId]);
}
export async function updatePin(userId, pinHash) {
    await db.pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, userId]);
}
// ──────────────────────────── Devices ────────────────────────────
export async function registerDevice(d) {
    await db.pool.query('INSERT INTO devices (user_id, device_identifier, fingerprint, os_type) VALUES ($1, $2, $3, $4)', [d.user_id, d.device_identifier, d.fingerprint, d.os_type]);
}
export async function getDevicesByUserId(userId) {
    const result = await db.pool.query('SELECT * FROM devices WHERE user_id = $1', [userId]);
    return result.rows;
}
export async function getDeviceCountByUserId(userId) {
    const result = await db.pool.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [userId]);
    return parseInt(result.rows[0].count, 10);
}
export async function getOldestDeviceByUserId(userId) {
    const result = await db.pool.query('SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1', [userId]);
    return result.rows[0] || null;
}
export async function findDevice(userId, fingerprint) {
    const result = await db.pool.query('SELECT * FROM devices WHERE user_id = $1 AND fingerprint = $2', [userId, fingerprint]);
    return result.rows[0] || null;
}
export async function getDeviceByIdentifierAndFingerprint(identifier, fingerprint) {
    const result = await db.pool.query('SELECT * FROM devices WHERE device_identifier = $1 AND fingerprint = $2', [identifier, fingerprint]);
    return result.rows[0] || null;
}
export async function updateWebAuthn(deviceId, publicKey, credentialId, counter) {
    await db.pool.query('UPDATE devices SET public_key = $1, credential_id = $2, counter = $3 WHERE id = $4', [publicKey, credentialId, counter, deviceId]);
}
export async function updateChallenge(deviceId, challenge) {
    await db.pool.query('UPDATE devices SET current_challenge = $1 WHERE id = $2', [challenge, deviceId]);
}
export async function getChallenge(deviceId) {
    const result = await db.pool.query('SELECT current_challenge FROM devices WHERE id = $1', [deviceId]);
    return result.rows[0]?.current_challenge || null;
}
export async function removeDevice(deviceId, userId) {
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
    getOldestDeviceByUserId,
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
