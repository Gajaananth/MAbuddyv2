import api from './api';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
    identifier: string;
    fingerprint: string;
    os: string;
}

export function getHardwareFingerprint(): { fingerprint: string; machineId: string; os: string } {
    let os = 'Unknown';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (ua.indexOf('Win') !== -1) os = 'Windows';
    else if (ua.indexOf('Android') !== -1) os = 'Android';
    else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1 || ua.indexOf('like Mac') !== -1) os = 'iOS';
    else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
    else if (ua.indexOf('Linux') !== -1) os = 'Linux';

    // Normalize hardware metrics across browsers & profiles on the same physical machine
    const scrWidth = typeof window !== 'undefined' && window.screen ? window.screen.width : 0;
    const scrHeight = typeof window !== 'undefined' && window.screen ? window.screen.height : 0;
    const colorDepth = typeof window !== 'undefined' && window.screen ? window.screen.colorDepth : 24;
    const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

    let tz = '';
    try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        tz = '';
    }
    const tzOffset = new Date().getTimezoneOffset();

    // Stable machine hardware profile: identical in Chrome, Edge, Firefox, and different profiles on the same PC
    const hardwareCore = [
        os,
        scrWidth,
        scrHeight,
        colorDepth,
        cores,
        tz,
        tzOffset
    ].join('|');

    const fingerprint = btoa(hardwareCore);

    // Stable machine identifier derived deterministically from hardware profile
    let hash = 0;
    for (let i = 0; i < hardwareCore.length; i++) {
        hash = ((hash << 5) - hash) + hardwareCore.charCodeAt(i);
        hash |= 0;
    }
    const machineId = `dev-${os.toLowerCase()}-${Math.abs(hash).toString(36)}`;

    return { fingerprint, machineId, os };
}

export function getDeviceInfo(): DeviceInfo {
    const { fingerprint, machineId, os } = getHardwareFingerprint();

    let identifier = localStorage.getItem('zn_device_id');
    if (!identifier) {
        // Use deterministic machineId so different profiles/browsers on the same PC share the same identifier
        identifier = machineId || uuidv4();
        localStorage.setItem('zn_device_id', identifier);
    }

    return { identifier, fingerprint, os };
}

export const authService = {
    async register(data: any) {
        const device = getDeviceInfo();
        const response = await api.post('/auth/register', { ...data, device });
        return response.data;
    },

    async login(pin: string, identifiers?: any) {
        const device = getDeviceInfo();
        const response = await api.post('/auth/login', { pin, device, identifiers });
        return response.data;
    },

    async forgotPin(data: any) {
        const response = await api.post('/auth/forgot-pin', data);
        return response.data;
    },

    async getBiometricOptions() {
        const device = getDeviceInfo();
        const response = await api.get('/auth/biometrics/login-options', {
            params: {
                identifier: device.identifier,
                fingerprint: device.fingerprint
            }
        });
        return response.data;
    },

    async loginBiometric(biometricResponse: any, challenge: string) {
        const device = getDeviceInfo();
        const response = await api.post('/auth/biometrics/login-verify', {
            device,
            biometricResponse,
            challenge
        });
        return response.data;
    }
};
