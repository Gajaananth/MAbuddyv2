import axios from 'axios';

async function run() {
    try {
        const url = 'https://m-abuddyv2.vercel.app/api/tasks?archived=false';
        console.log('Fetching:', url);
        const res = await axios.get(url, { validateStatus: () => true });
        console.log('STATUS:', res.status);
        console.log('BODY:', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.error('FAIL:', e.message);
    }
}
run();
