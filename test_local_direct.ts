import { Request, Response } from 'express';
import app from './backend/index.js';
import axios from 'axios';

async function test() {
    console.log('Starting server for test...');
    const server = app.listen(3002, async () => {
        try {
            // Login
            const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
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
            
            console.log('Got token:', token ? 'YES' : 'NO');
            
            const chatRes = await axios.post('http://localhost:3002/api/chat', {
                message: 'test ping ' + Date.now(),
                publish_to_moltbook: false
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('CHAT SUCCESS:', chatRes.data);
        } catch (e: any) {
            console.error('HTTP STATUS:', e.response?.status);
            console.error('CHAT ERROR DATA:', e.response?.data);
            console.error('FULL ERROR MESSAGE:', e.message);
            console.error('STACK:', e.stack);
        }
        server.close();
        process.exit(0);
    });
}
test();
