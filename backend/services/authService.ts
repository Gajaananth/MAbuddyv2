import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import authQueries from '../db/authQueries.js';
import * as dbQueries from '../db/queries.js';
import { eventService, KaruppuEvent } from './eventService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nova-silent-beast-protocol-secure-key-2026';
const MAX_USERS = 5;
const LOCKOUT_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 5;

// Lead Admin gets 5 devices, standard operators get 3.
async function getDeviceLimit(userId: string): Promise<number> {
    try {
        const users = await authQueries.getAllUsers();
        // Sort by created_at to find the first (admin) user
        const sortedUsers = users.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (sortedUsers.length > 0 && sortedUsers[0].id === userId) {
            return 5;
        }
        return 3;
    } catch {
        return 3; // Fallback to safe minimum
    }
}


export async function hashValue(val: string): Promise<string> {
    return bcrypt.hash(val, 10);
}

export function deterministicHash(val: string): string {
    return crypto.createHash('sha256').update(val).digest('hex');
}

export async function compareValue(val: string, hash: string): Promise<boolean> {
    // 1. Plain text (emergency/legacy)
    if (val === hash) return true;

    // 2. MD5 (Legacy 32-char hex)
    if (hash.length === 32 && /^[0-9a-f]+$/.test(hash)) {
        return crypto.createHash('md5').update(val).digest('hex') === hash;
    }

    // 3. SHA-256 (64-char hex)
    if (hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
        return deterministicHash(val) === hash;
    }

    // 4. BCrypt
    try {
        return await bcrypt.compare(val, hash);
    } catch (e) {
        return false;
    }
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

    const dobHash = deterministicHash(dobNormalized);
    const q1Hash = deterministicHash(q1Normalized);
    const q2Hash = deterministicHash(q2Normalized);
    const q3Hash = deterministicHash(q3Normalized);

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
        const userLimit = await getDeviceLimit(user.id);
        if (userDeviceCount >= userLimit) {
            throw new Error(`DEVICE QUOTA REACHED: Maximum of ${userLimit} devices allowed for your clearance level.`);
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

    await dbQueries.logSecurityEvent(user.id, {
        event_type: 'REGISTER',
        actor: 'OPERATOR',
        risk_level: 'LOW',
        details: `New device or profile registration sequence completed: ${u.device.identifier}`
    });

    eventService.emitKaruppu(KaruppuEvent.SECURITY_EVENT_LOGGED, { userId: user.id, type: 'REGISTER' });

    return { success: true, userId: user.id };
}

export async function login(c: {
    pin: string;
    identifiers?: {
        dob: string;
        q1: string;
        q2: string;
        q3: number;
    },
    device: {
        identifier: string;
        fingerprint: string;
        os?: string;
    }
}) {
    // 1. Identification: Determine who is trying to access the grid
    let matchedUser = null;
    let registeredDevice = null;

    if (c.identifiers) {
        // Full Identification Protocol
        const dobHash = deterministicHash(c.identifiers.dob);
        const q1Hash = deterministicHash(normalizeInput(c.identifiers.q1));
        const q2Hash = deterministicHash(normalizeInput(c.identifiers.q2));
        const q3Hash = deterministicHash(c.identifiers.q3.toString());

        matchedUser = await authQueries.findUserByIdentifiers({
            dob_hash: dobHash,
            q1_hash: q1Hash,
            q2_hash: q2Hash,
            q3_hash: q3Hash
        });

        if (!matchedUser) {
            throw new Error('ACCESS DENIED: Security identifiers do not match any registered operator.');
        }
    } else {
        // Fast Identification Protocol (Device Recognized)
        const users = await authQueries.getUserByPin('');
        for (const user of users) {
            const devices = await authQueries.getDevicesByUserId(user.id);
            const found = devices.find(d => d.device_identifier === c.device.identifier && d.fingerprint === c.device.fingerprint);
            if (found) {
                matchedUser = user;
                registeredDevice = found;
                break;
            }
        }
    }

    if (!matchedUser) {
        console.error(`[Auth] Login Failed: No user found for provided PIN.`);
        throw new Error('STATUS: DEVICE_UNRECOGNIZED. Initiate Identity Verification.');
    }

    // 2. Check Lockout Status
    if (matchedUser.lock_until && new Date(matchedUser.lock_until) > new Date()) {
        const remaining = Math.ceil((new Date(matchedUser.lock_until).getTime() - Date.now()) / 1000 / 60);
        throw new Error(`ACCOUNT LOCKED: Retry in ${remaining} minutes.`);
    }

    // 3. Verification: PIN Validation
    const isMatch = await compareValue(c.pin, matchedUser.pin_hash);

    if (!isMatch) {
        const newCount = (matchedUser.failed_attempts || 0) + 1;
        let lockUntil = null;
        if (newCount >= MAX_FAILED_ATTEMPTS) {
            lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        }
        await authQueries.updateFailedAttempts(matchedUser.id, newCount, lockUntil);

        if (lockUntil) {
            throw new Error(`ACCOUNT LOCKED: 5 failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`);
        }
        throw new Error(`INVALID PIN: Attempt ${newCount} of ${MAX_FAILED_ATTEMPTS}.`);
    }

    // 4. Cleanup & Auto-Link
    await authQueries.resetFailedAttempts(matchedUser.id);

    if (!registeredDevice) {
        // Recognition successful via Identifiers -> Auto-Link the device now
        const existingDevice = await authQueries.findDevice(matchedUser.id, c.device.fingerprint);
        if (!existingDevice) {
            const deviceCount = await authQueries.getDeviceCountByUserId(matchedUser.id);
            const userLimit = await getDeviceLimit(matchedUser.id);

            if (deviceCount >= userLimit) {
                const oldestDevice = await authQueries.getOldestDeviceByUserId(matchedUser.id);
                if (oldestDevice) {
                    await authQueries.removeDevice(oldestDevice.id, matchedUser.id);
                    console.warn(`[Auth] Replaced oldest device ${oldestDevice.device_identifier} for user ${matchedUser.id} to allow new login.`);
                } else {
                    throw new Error(`DEVICE_LIMIT_EXCEEDED: Maximum of ${userLimit} devices allowed for your clearance level.`);
                }
            }

            await authQueries.registerDevice({
                user_id: matchedUser.id,
                device_identifier: c.device.identifier,
                fingerprint: c.device.fingerprint,
                os_type: c.device.os || 'unknown'
            });
            // Re-find to get the ID for the token
            registeredDevice = await authQueries.findDevice(matchedUser.id, c.device.fingerprint);
        } else {
            registeredDevice = existingDevice;
        }
    }

    // 5. Generate Session
    const token = jwt.sign(
        { userId: matchedUser.id, deviceId: registeredDevice?.id },
        JWT_SECRET,
        { expiresIn: '72h' }
    );

    await dbQueries.logSecurityEvent(matchedUser.id, {
        event_type: 'LOGIN',
        actor: 'OPERATOR',
        risk_level: 'LOW',
        details: `Successful grid access via PIN: Device ${c.device.identifier}`
    });

    eventService.emitKaruppu(KaruppuEvent.SECURITY_EVENT_LOGGED, { userId: matchedUser.id, type: 'LOGIN' });

    return {
        success: true,
        token,
        user: {
            id: matchedUser.id,
            isBiometricEnabled: !!registeredDevice?.public_key
        }
    };
}

export async function loginBiometric(c: {
    device: {
        identifier: string;
        fingerprint: string;
    },
    biometricResponse: any,
    challenge: string,
    origin: string,
    rpID: string
}) {
    // 1. Identify device and user directly
    const device = await authQueries.getDeviceByIdentifierAndFingerprint(c.device.identifier, c.device.fingerprint);
    
    if (!device || !device.public_key || !device.credential_id) {
        throw new Error('ACCESS_DENIED: Biometrics not enrolled for this device.');
    }

    const users = await authQueries.getAllUsers();
    const matchedUser = users.find(u => u.id === device.user_id);

    if (!matchedUser) {
        throw new Error('ACCESS_DENIED: Associated operator profile missing.');
    }

    // 2. Verify Biometric
    const { verifyLogin } = await import('./webAuthnService.js');
    const verification = await verifyLogin(
        c.biometricResponse, 
        c.challenge, 
        device.public_key, 
        device.credential_id,
        (device && typeof device.counter === 'number') ? device.counter : 0,
        c.origin,
        c.rpID
    );



    if (!verification.verified) {
        throw new Error('BIOMETRIC_FAILURE: Identity not confirmed.');
    }

    // 3. Update counter and reset failed attempts
    if (typeof verification.newCounter === 'number') {
        await authQueries.updateWebAuthn(device.id, device.public_key, device.credential_id, verification.newCounter);
    }
    await authQueries.resetFailedAttempts(matchedUser.id);


    // 4. Generate Session
    const token = jwt.sign({ userId: matchedUser.id, deviceId: device.id }, JWT_SECRET, { expiresIn: '24h' });

    await dbQueries.logSecurityEvent(matchedUser.id, {
        event_type: 'LOGIN_BIOMETRIC',
        actor: 'OPERATOR',
        risk_level: 'LOW',
        details: `Biometric grid access: Device ${c.device.identifier}`
    });

    eventService.emitKaruppu(KaruppuEvent.SECURITY_EVENT_LOGGED, { userId: matchedUser.id, type: 'LOGIN_BIOMETRIC' });

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

    await dbQueries.logSecurityEvent(userId, {
        event_type: 'PIN_CHANGE',
        actor: 'OPERATOR',
        risk_level: 'MEDIUM',
        details: 'Self-service PIN update completed successfully.'
    });

    eventService.emitKaruppu(KaruppuEvent.SECURITY_EVENT_LOGGED, { userId, type: 'PIN_CHANGE' });

    return { success: true };
}

export async function forgotPin(data: {
    dob: string;
    q1: string;
    q2: string;
    q3: number;
    newPin: string;
}) {
    const dobHash = deterministicHash(data.dob);
    const q1Hash = deterministicHash(normalizeInput(data.q1));
    const q2Hash = deterministicHash(normalizeInput(data.q2));
    const q3Hash = deterministicHash(data.q3.toString());

    const matchedUser = await authQueries.findUserByIdentifiers({
        dob_hash: dobHash,
        q1_hash: q1Hash,
        q2_hash: q2Hash,
        q3_hash: q3Hash
    });

    if (!matchedUser) {
        throw new Error('VERIFICATION FAILED: Mandatory security identifiers do not match records.');
    }

    const newPinHash = await hashValue(data.newPin);
    await authQueries.updatePin(matchedUser.id, newPinHash);
    await authQueries.resetFailedAttempts(matchedUser.id);

    return { success: true };
}

export async function enableBiometrics(userId: string, deviceId: string, publicKey: string, credentialId: string, counter: number) {
    await authQueries.updateWebAuthn(deviceId, publicKey, credentialId, counter);
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

    await authQueries.updateWebAuthn(deviceId, '', '', 0);
    return { success: true };
}

export async function revokeBiometrics(userId: string, deviceId: string) {
    // Simple revocation for already authenticated users in settings
    await authQueries.updateWebAuthn(deviceId, '', '', 0);
    return { success: true };
}

