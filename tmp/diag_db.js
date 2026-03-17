import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false }
};

if (!dbConfig.connectionString) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const pool = new Pool(dbConfig);

console.log('Attempting to connect to:', new URL(dbConfig.connectionString).hostname);

async function test() {
  const start = Date.now();
  try {
    const client = await pool.connect();
    console.log(`Connected in ${Date.now() - start}ms`);
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err.message);
    console.error('Code:', err.code);
  } finally {
    pool.end();
  }
}

test();
