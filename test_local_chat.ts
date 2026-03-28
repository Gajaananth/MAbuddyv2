import axios from 'axios';
import crypto from 'crypto';

async function testProd() {
    try {
        console.log('Logging in to PROD...');
        // Login with correct payload
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            pin: '1234',
            device: {
                id: 'test-device-' + Date.now(),
                userAgent: 'TestScript',
                platform: 'Node',
                vendor: 'Test'
            },
            identifiers: {
                system: 'windows',
                browserFingerprint: 'test-fingerprint'
            }
        });
        const token = loginRes.data?.data?.token || loginRes.headers['x-auth-token'];
        
        if (!token) {
            console.log('Login failed', loginRes.data);
            return;
        }
        
        console.log('Got token, sending chat request...');
        
        const chatRes = await axios.post('http://localhost:3001/api/chat', {
            message: 'test ping ' + Date.now(),
            publish_to_moltbook: false
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('CHAT SUCCESS:', chatRes.data);
    } catch (e: any) {
        console.error('CHAT ERROR:', e.response?.data || e.message);
    }
}

testProd();
