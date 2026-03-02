const { chromium } = require('playwright');

async function test() {
    try {
        console.log('Attempting to launch chromium...');
        const browser = await chromium.launch({ headless: true });
        console.log('Chromium launched successfully!');
        await browser.close();
    } catch (err) {
        console.error('FAILED to launch chromium:', err.message);
    }
}

test();
