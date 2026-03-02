const axios = require('axios');

async function testRaid() {
    try {
        console.log('Triggering manual raid via API...');
        const res = await axios.post('http://localhost:3001/api/intelligence/raid/trigger',
            { type: 'mid-week' },
            {
                headers: {
                    'X-Operator-Protocol-Key': 'nova-operator-99-alpha',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error('API Error:', err.response.status, err.response.data);
        } else {
            console.error('Request Error:', err.message);
        }
    }
}

testRaid();
