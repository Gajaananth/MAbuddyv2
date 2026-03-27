import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Simulation of hashing logic
function deterministicHash(val: string): string {
    return crypto.createHash('sha256').update(val).digest('hex');
}

const connectionString = (process.env.DATABASE_URL || '').trim();
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function simulateLogin() {
    console.log('--- Auth Simulation Grid ---');
    const pin = '2026'; // The identified PIN
    const fingerprint = 'TW96aWxsYS81LjAgKExpbm==vNTM3LjM2fDQxMnw5MTV8ZW4tR0J8LTMz'; // From DB

    try {
        const client = await pool.connect();
        
        // 1. Get All Users
        const usersRes = await client.query('SELECT * FROM users');
        const users = usersRes.rows;
        console.log('Users found in DB:', users.length);

        let matchedUser = null;
        for (const u of users) {
             console.log(`User ID: ${u.id} | Pin Hash: "${u.pin_hash}" (Length: ${u.pin_hash.length})`);
             const md5 = crypto.createHash('md5').update(pin).digest('hex');
             console.log(`Comparing md5("${pin}") = "${md5}" with "${u.pin_hash}"`);
             
             if (pin === u.pin_hash || deterministicHash(pin) === u.pin_hash || md5 === u.pin_hash) {
                 matchedUser = u;
                 console.log('MATCH FOUND!');
                 break;
             }
        }

        if (!matchedUser) {
            console.error('SIMULATION FAILURE: No user matched the PIN.');
            client.release();
            return;
        }
        console.log('User Matched:', matchedUser.id);

        // 2. Check Device
        const deviceRes = await client.query(
            'SELECT * FROM devices WHERE user_id = $1 AND fingerprint = $2',
            [matchedUser.id, fingerprint]
        );
        
        if (deviceRes.rows.length === 0) {
            console.error('SIMULATION FAILURE: Device not found for fingerprint.');
            const allDevices = await client.query('SELECT * FROM devices WHERE user_id = $1', [matchedUser.id]);
            console.log('Actually registered fingerprints for this user:', allDevices.rows.map(d => d.fingerprint));
        } else {
            console.log('SUCCESS: Login simulation complete. Device recognized.');
        }

        client.release();
    } catch (err: any) {
        console.error('Simulation crashed:', err.message);
    } finally {
        pool.end();
    }
}

simulateLogin();
