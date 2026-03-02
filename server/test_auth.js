const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function test() {
    const hash = await bcrypt.hash('123456', 10);
    console.log('Hash:', hash);
    const match = await bcrypt.compare('123456', hash);
    console.log('Match:', match);

    const token = jwt.sign({ test: true }, 'secret');
    const decoded = jwt.verify(token, 'secret');
    console.log('Decoded:', decoded);
}

test();
