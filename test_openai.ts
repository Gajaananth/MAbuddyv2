import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testOpenAI() {
    const key = process.env.OPENAI_API_KEY;
    console.log('Testing OpenAI Key:', key ? key.slice(0, 15) + '...' : 'MISSING');
    
    try {
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hello' }]
        }, {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        console.log('SUCCESS:', res.data.choices[0].message.content);
    } catch (e: any) {
        console.error('FAIL:', e.response ? e.response.data : e.message);
    }
}

testOpenAI();
