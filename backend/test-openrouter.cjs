const axios = require('axios');
require('dotenv').config({path: './.env'});

async function test() {
  try {
    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
            messages: [
                { role: 'system', content: 'test' },
                { role: 'user', content: 'hello' }
            ],
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            }
        }
    );
    console.log(response.data.choices[0].message);
  } catch (e) {
    if(e.response) {
      console.log('Error Data:', e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
test();
