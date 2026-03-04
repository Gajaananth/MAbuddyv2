import api from './api';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
    identifier: string;
    fingerprint: string;
    os: string;
}

export function getDeviceInfo(): DeviceInfo {
    let identifier = localStorage.getItem('zn_device_id');
    if (!identifier) {
        identifier = uuidv4();
        localStorage.setItem('zn_device_id', identifier);
    }

    const fingerprint = btoa([
        navigator.userAgent,
        screen.width,
        screen.height,
        navigator.language,
        new Date().getTimezoneOffset()
    ].join('|'));

    let os = 'Unknown';
    if (navigator.userAgent.indexOf('Win') !== -1) os = 'Windows';
    if (navigator.userAgent.indexOf('Mac') !== -1) os = 'MacOS';
    if (navigator.userAgent.indexOf('Linux') !== -1) os = 'Linux';
    if (navigator.userAgent.indexOf('Android') !== -1) os = 'Android';
    if (navigator.userAgent.indexOf('like Mac') !== -1) os = 'iOS';

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
        const response = await api.get('/auth/biometrics/login-options');
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
