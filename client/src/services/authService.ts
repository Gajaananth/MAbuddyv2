import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:3001/api';

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
        const response = await axios.post(`${API_URL}/auth/register`, { ...data, device });
        return response.data;
    },

    async login(pin: string) {
        const device = getDeviceInfo();
        const response = await axios.post(`${API_URL}/auth/login`, { pin, device });
        return response.data;
    },

    async forgotPin(data: any) {
        const response = await axios.post(`${API_URL}/auth/forgot-pin`, data);
        return response.data;
    },

    async getBiometricOptions() {
        const response = await axios.get(`${API_URL}/auth/biometrics/login-options`);
        return response.data;
    },

    async loginBiometric(biometricResponse: any, challenge: string) {
        const device = getDeviceInfo();
        const response = await axios.post(`${API_URL}/auth/biometrics/login-verify`, {
            device,
            biometricResponse,
            challenge
        });
        return response.data;
    }
};
