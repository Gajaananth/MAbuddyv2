import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authQueries from '../db/authQueries';

const JWT_SECRET = process.env.JWT_SECRET || 'nova-silent-beast-protocol-secure-key-2026';
const MAX_USERS = 2;
const MAX_DEVICES = 10;
const LOCKOUT_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 5;

export async function hashValue(val: string): Promise<string> {
    return bcrypt.hash(val, 10);
}

export async function compareValue(val: string, hash: string): Promise<boolean> {
    return bcrypt.compare(val, hash);
}

export function normalizeInput(val: string): string {
    return val.toLowerCase().trim().replace(/\s+/g, '');
}

export async function register(u: {
    dob: string;
    pin: string;
    q1: string;
    q2: string;
    q3: number;
    device: {
        identifier: string;
        fingerprint: string;
        os: string;
    }
}) {
    // 1. Normalize & Hash Identification Data
    const dobNormalized = u.dob;
    const q1Normalized = normalizeInput(u.q1);
    const q2Normalized = normalizeInput(u.q2);
    const q3Normalized = u.q3.toString();

    const [dobHash, q1Hash, q2Hash, q3Hash] = await Promise.all([
        hashValue(dobNormalized),
        hashValue(q1Normalized),
        hashValue(q2Normalized),
        hashValue(q3Normalized)
    ]);

    // 2. Search for Existing User
    let user = await authQueries.findUserByIdentifiers({
        dob_hash: dobHash,
        q1_hash: q1Hash,
        q2_hash: q2Hash,
        q3_hash: q3Hash
    });

    if (user) {
        // User exists -> Check if PIN matches
        const pinMatch = await compareValue(u.pin, user.pin_hash);
        if (!pinMatch) {
            throw new Error('IDENTIFICATION CONFLICT: Security identifiers match an existing user, but PIN is incorrect.');
        }

        // PIN matches -> Check if device is already registered to THIS user
        const existingDevice = await authQueries.findDevice(user.id, u.device.fingerprint);
        if (existingDevice) {
            return { success: true, userId: user.id, message: 'DEVICE_ALREADY_LINKED' };
        }

        // Check Per-User Device Quota
        const userDeviceCount = await authQueries.getDeviceCountByUserId(user.id);
        if (userDeviceCount >= MAX_DEVICES) {
            throw new Error(`DEVICE QUOTA REACHED: Maximum of ${MAX_DEVICES} devices allowed per protocol operator.`);
        }
    } else {
        // New User -> Check Global User Quota
        const userCount = await authQueries.getUserCount();
        if (userCount >= MAX_USERS) {
            throw new Error('SYSTEM QUOTA REACHED: Maximum operator limit exceeded. Contact lead architect.');
        }

        const pinHash = await hashValue(u.pin);
        user = await authQueries.createUser({
            dob_hash: dobHash,
            pin_hash: pinHash,
            q1_hash: q1Hash,
            q2_hash: q2Hash,
            q3_hash: q3Hash
        });
    }

    // 3. Bind Device to User (Existing or New)
    await authQueries.registerDevice({
        user_id: user.id,
        device_identifier: u.device.identifier,
        fingerprint: u.device.fingerprint,
        os_type: u.device.os
    });

    return { success: true, userId: user.id };
}

export async function login(c: {
    pin: string;
    device: {
        identifier: string;
        fingerprint: string;
    }
}) {
    // 1. Fetch all users (only 2 max)
    const users = await authQueries.getUserByPin(''); // This currently returns all users

    // 2. Identify user from device
    // In a real device bound system, we check if this device is registered to one of the users
    // We iterate through users and their devices to find a match
    let matchedUser = null;
    let registeredDevice = null;

    for (const user of users) {
        const devices = await authQueries.getDevicesByUserId(user.id);
        const device = devices.find(d => d.device_identifier === c.device.identifier && d.fingerprint === c.device.fingerprint);
        if (device) {
            matchedUser = user;
            registeredDevice = device;
            break;
        }
    }

    if (!matchedUser) {
        throw new Error('ACCESS DENIED: Device not registered to any protocol operator.');
    }

    // 3. Check Lockout
    if (matchedUser.lock_until && new Date(matchedUser.lock_until) > new Date()) {
        const remaining = Math.ceil((new Date(matchedUser.lock_until).getTime() - Date.now()) / 1000 / 60);
        throw new Error(`ACCOUNT LOCKED: Excessive failed requests. Retry in ${remaining} minutes.`);
    }

    // 4. Verify PIN
    const isMatch = await compareValue(c.pin, matchedUser.pin_hash);

    if (!isMatch) {
        const newCount = (matchedUser.failed_attempts || 0) + 1;
        let lockUntil = null;
        if (newCount >= MAX_FAILED_ATTEMPTS) {
            lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        }
        await authQueries.updateFailedAttempts(matchedUser.id, newCount, lockUntil);

        if (lockUntil) {
            throw new Error(`ACCOUNT LOCKED: 5 failed attempts reached. Locked for ${LOCKOUT_MINUTES} minutes.`);
        }
        throw new Error(`INVALID PIN: Attempt ${newCount} of ${MAX_FAILED_ATTEMPTS}.`);
    }

    // 5. Reset Counter
    await authQueries.resetFailedAttempts(matchedUser.id);

    // 6. Generate Session
    const token = jwt.sign({ userId: matchedUser.id, deviceId: registeredDevice.id }, JWT_SECRET, { expiresIn: '24h' });

    return {
        success: true,
        token,
        user: {
            id: matchedUser.id,
            isBiometricEnabled: !!registeredDevice.public_key
        }
    };
}

export async function loginBiometric(c: {
    device: {
        identifier: string;
        fingerprint: string;
    },
    biometricResponse: any,
    challenge: string
}) {
    // 1. Identify device
    const users = await authQueries.getUserByPin('');
    let matchedUser = null;
    let registeredDevice = null;

    for (const user of users) {
        const devices = await authQueries.getDevicesByUserId(user.id);
        const device = devices.find(d => d.device_identifier === c.device.identifier && d.fingerprint === c.device.fingerprint);
        if (device && device.public_key) {
            matchedUser = user;
            registeredDevice = device;
            break;
        }
    }

    if (!matchedUser || !registeredDevice) {
        throw new Error('ACCESS DENIED: Biometrics not enrolled for this device.');
    }

    // 2. Verify Biometric
    const { verifyLogin } = require('./webAuthnService');
    const verification = await verifyLogin(c.biometricResponse, c.challenge, registeredDevice.public_key, registeredDevice.counter || 0);

    if (!verification.verified) {
        throw new Error('BIOMETRIC FAILED: Identity not confirmed.');
    }

    // 3. Reset Counter (just in case they were trying pins)
    await authQueries.resetFailedAttempts(matchedUser.id);

    // 4. Generate Session
    const token = jwt.sign({ userId: matchedUser.id, deviceId: registeredDevice.id }, JWT_SECRET, { expiresIn: '24h' });

    return {
        success: true,
        token,
        user: {
            id: matchedUser.id,
            isBiometricEnabled: true
        }
    };
}

export async function verifySecurityQuestions(userId: string, data: { q1: string, q2: string, q3: number }): Promise<boolean> {
    const users = await authQueries.getUserByPin('');
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const [q1M, q2M, q3M] = await Promise.all([
        compareValue(normalizeInput(data.q1), user.q1_hash),
        compareValue(normalizeInput(data.q2), user.q2_hash),
        compareValue(data.q3.toString(), user.q3_hash)
    ]);

    return q1M && q2M && q3M;
}

export async function changePin(userId: string, data: { oldPin: string, newPin: string, q1: string, q2: string, q3: number }) {
    const users = await authQueries.getUserByPin('');
    const user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error('NOT FOUND: User identity missing.');

    // 1. Verify old PIN
    const pinMatch = await compareValue(data.oldPin, user.pin_hash);
    if (!pinMatch) throw new Error('INVALID PIN: Authorization denied.');

    // 2. Verify security questions
    const questionsMatch = await verifySecurityQuestions(userId, { q1: data.q1, q2: data.q2, q3: data.q3 });
    if (!questionsMatch) throw new Error('VERIFICATION FAILED: Security answers do not match records.');

    // 3. Update
    const newHash = await hashValue(data.newPin);
    await authQueries.updatePin(userId, newHash);
    return { success: true };
}

export async function forgotPin(data: {
    dob: string;
    q1: string;
    q2: string;
    q3: number;
    newPin: string;
}) {
    const users = await authQueries.getUserByPin('');
    let matchedUser = null;

    for (const user of users) {
        const dobMatch = await compareValue(data.dob, user.dob_hash);
        if (dobMatch) {
            const q1M = await compareValue(normalizeInput(data.q1), user.q1_hash);
            const q2M = await compareValue(normalizeInput(data.q2), user.q2_hash);
            const q3M = await compareValue(data.q3.toString(), user.q3_hash);

            if (q1M && q2M && q3M) {
                matchedUser = user;
                break;
            }
        }
    }

    if (!matchedUser) {
        throw new Error('VERIFICATION FAILED: Mandatory security identifiers do not match records.');
    }

    const newPinHash = await hashValue(data.newPin);
    await authQueries.updatePin(matchedUser.id, newPinHash);
    await authQueries.resetFailedAttempts(matchedUser.id);

    return { success: true };
}

export async function enableBiometrics(userId: string, deviceId: string, publicKey: string, credentialId: string) {
    await authQueries.updateWebAuthn(deviceId, publicKey, credentialId);
    return { success: true };
}

export async function disableBiometrics(userId: string, deviceId: string, data: { pin: string, q1: string, q2: string, q3: number }) {
    const users = await authQueries.getUserByPin('');
    const user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error('Operator not found.');

    const pinMatch = await compareValue(data.pin, user.pin_hash);
    if (!pinMatch) throw new Error('PIN Denied.');

    const qMatch = await verifySecurityQuestions(userId, data);
    if (!qMatch) throw new Error('Questions Denied.');

    await authQueries.updateWebAuthn(deviceId, '', '');
    return { success: true };
}
