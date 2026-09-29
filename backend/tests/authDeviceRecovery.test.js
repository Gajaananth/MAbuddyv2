import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../db/connection.js';
import authQueries from '../db/authQueries.js';
import * as authService from '../services/authService.js';

test('login recovers by replacing oldest device when identifiers verify and quota is full', async () => {
    const originalFindUserByIdentifiers = authQueries.findUserByIdentifiers;
    const originalGetDeviceCountByUserId = authQueries.getDeviceCountByUserId;
    const originalGetOldestDeviceByUserId = authQueries.getOldestDeviceByUserId;
    const originalRemoveDevice = authQueries.removeDevice;
    const originalRegisterDevice = authQueries.registerDevice;
    const originalFindDevice = authQueries.findDevice;
    const originalGetDevicesByUserId = authQueries.getDevicesByUserId;
    const originalResetFailedAttempts = authQueries.resetFailedAttempts;
    const originalPoolDescriptor = Object.getOwnPropertyDescriptor(db, 'pool');
    let removedDeviceId = null;
    let registeredDevice = null;
    try {
        Object.defineProperty(db, 'pool', {
            value: { query: async () => ({ rows: [] }) },
            configurable: true,
            writable: true,
        });
        authQueries.findUserByIdentifiers = async () => ({
            id: 'user-1',
            pin_hash: await authService.hashValue('1234'),
            failed_attempts: 0,
            lock_until: null,
        });
        authQueries.getDeviceCountByUserId = async () => 10; // New limit is 10 for standard operators
        authQueries.getOldestDeviceByUserId = async () => ({
            id: 'old-device-1',
            user_id: 'user-1',
            device_identifier: 'old-phone',
            fingerprint: 'old-fingerprint',
            os_type: 'iOS',
            created_at: new Date().toISOString(),
        });
        authQueries.removeDevice = async (deviceId) => {
            removedDeviceId = deviceId;
        };
        authQueries.registerDevice = async (device) => {
            registeredDevice = device;
        };
        authQueries.findDevice = async () => null;
        // Return empty array so the relaxed OR-lookup in auto-link phase finds no existing device
        authQueries.getDevicesByUserId = async () => [];
        authQueries.resetFailedAttempts = async () => { };
        const result = await authService.login({
            pin: '1234',
            identifiers: {
                dob: '2000-01-15',
                q1: 'alpha',
                q2: 'beta',
                q3: 2024,
            },
            device: {
                identifier: 'new-phone',
                fingerprint: 'new-fingerprint',
                os: 'Android',
            },
        });
        assert.equal(result.success, true);
        assert.equal(removedDeviceId, 'old-device-1');
        assert.equal(registeredDevice?.device_identifier, 'new-phone');
    }
    finally {
        if (originalPoolDescriptor) {
            Object.defineProperty(db, 'pool', originalPoolDescriptor);
        }
        authQueries.findUserByIdentifiers = originalFindUserByIdentifiers;
        authQueries.getDeviceCountByUserId = originalGetDeviceCountByUserId;
        authQueries.getOldestDeviceByUserId = originalGetOldestDeviceByUserId;
        authQueries.removeDevice = originalRemoveDevice;
        authQueries.registerDevice = originalRegisterDevice;
        authQueries.findDevice = originalFindDevice;
        authQueries.getDevicesByUserId = originalGetDevicesByUserId;
        authQueries.resetFailedAttempts = originalResetFailedAttempts;
    }
});
