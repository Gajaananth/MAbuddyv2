import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// SSL Bypass for Supabase remote connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    console.log('Checking trend_analyses table for cluster column...');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'trend_analyses' AND column_name = 'cluster'
    `);
    
    if (res.rows.length > 0) {
      console.log('✅ Cluster column EXISTS in remote DB.');
    } else {
      console.log('❌ Cluster column MISSING. Attempting DIRECT REMOTE MIGRATION...');
      await pool.query('ALTER TABLE trend_analyses ADD COLUMN IF NOT EXISTS cluster VARCHAR(100) DEFAULT \'CORE\'');
      console.log('✅ Migration executed successfully.');
    }

    console.log('Checking agents table...');
    const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agent_network' AND column_name = 'last_collaboration'
    `);
    if (res2.rows.length > 0) {
      console.log('✅ last_collaboration column EXISTS in remote DB.');
    } else {
      console.log('❌ last_collaboration column MISSING. Attempting DIRECT REMOTE MIGRATION...');
      await pool.query('ALTER TABLE agent_network ADD COLUMN IF NOT EXISTS last_collaboration TIMESTAMPTZ');
      console.log('✅ Migration executed successfully.');
    }

    // Ensure root user exists
    console.log('Ensuring SYSTEM_ROOT user exists...');
    await pool.query(`
      INSERT INTO users (id, dob_hash, pin_hash, q1_hash, q2_hash, q3_hash)
      VALUES ('00000000-0000-0000-0000-000000000000', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ User sync complete.');

  } catch (e) {
    console.error('Error during remote migration:', e.message);
  } finally {
    await pool.end();
  }
}

verify();
