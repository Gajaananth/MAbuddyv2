import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Global SSL Bypass: Required for certain Supabase/Vercel certificate chains.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// better-sqlite3 is a native C++ addon — it will be loaded dynamically if needed
// and NEVER on Vercel to avoid runtime crashes.
let sqliteDb: any = null;
export let isPostgresActive = false;
let isInitializing = false;

// Ensure DATABASE_URL is present before initializing the pool to prevent startup crashes.
let pool: any = null;

export function getPool() {
  if (pool) return pool;
  
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.warn('[DB] CRITICAL: DATABASE_URL is empty. Grid disconnected.');
    return null;
  }

  console.log('[DB] Initializing PostgreSQL Pool...');
  
  const dbConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false }
  };
  
  pool = new Pool(dbConfig);
  pool.on('error', (err: any) => {
    console.error('[DB] PostgreSQL Pool Error:', err.message);
  });
  
  return pool;
}

const DB_PATH = path.join(process.cwd(), 'zium_nova.sqlite');

let initPromise: Promise<void> | null = null;

/**
 * Initialize Database with Resilience.
 */
export async function initDatabase(): Promise<void> {
  if (isPostgresActive) return;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log('[DB] Protocol: Establishing Grid Connection...');
    console.log('[DB] Mode:', process.env.NODE_ENV);
    console.log('[DB] URL Specified:', process.env.DATABASE_URL ? 'YES' : 'NO');
    
    try {
      const pool = getPool();
      if (!pool) {
          console.error('[DB] CRITICAL Error: getPool() returned NULL.');
          throw new Error('DATABASE_URL mission critical environment variable is MISSING.');
      }

      console.log('[DB] Requesting Pool Connection...');
      const client = await pool.connect();
      console.log('[DB] Pool Connection ACQUIRED.');

      try {
        isPostgresActive = true;
        const dbHost = new URL(process.env.DATABASE_URL!).hostname;
        console.log(`[DB] PostgreSQL Grid: ONLINE | Host: ${dbHost}`);
        
        // Run migrations in background/separately to avoid Vercel Function Timeout (10s limit)
        runMigrations(client).catch(err => {
            console.error('[DB] Background Migration Error:', err.message);
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      initPromise = null; // Allow retry on failure
      console.error('[DB] CRITICAL: Grid Connection Failed.');
      console.error('[DB] ERROR DETAILS:', error.message);
      if (error.stack) console.error('[DB] ERROR STACK:', error.stack);
      
      // If we are on Vercel, we need to be very explicit about the timeout logic
      if (process.env.VERCEL) {
        throw new Error(`[Zium Nova] Database Grid Timeout/Failure: ${error.message}`);
      }
      
      console.warn('[DB] CONNECTION REJECTED. Activating Local Shadow Logic (SQLite Fallback).');
      isPostgresActive = false;
    }
  })();

  return initPromise;
}

/**
 * Optimized Migration Protocol
 */
async function runMigrations(client: any) {
    console.log('[DB] Grid: Synchronizing Protocol Tables...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
      -- Multi-Agent Task Support (v3.2.0)
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        task_id_str VARCHAR(10) NOT NULL,
        task_name TEXT NOT NULL,
        assigned_to VARCHAR(50) DEFAULT 'ZIUM NOVA',
        status VARCHAR(20) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN-PROGRESS', 'COMPLETED', 'BLOCKED')),
        priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        action_plan TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, task_id_str)
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'action_plan') THEN
          ALTER TABLE tasks ADD COLUMN action_plan TEXT DEFAULT '';
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dob_hash TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        q1_hash TEXT NOT NULL,
        q2_hash TEXT NOT NULL,
        q3_hash TEXT NOT NULL,
        failed_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
        topic_tag VARCHAR(100) DEFAULT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        user_id VARCHAR(255) DEFAULT 'default_user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'nova')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        risk_level VARCHAR(10) DEFAULT 'Medium' CHECK (risk_level IN ('Low', 'Medium', 'High')),
        monetization_potential VARCHAR(20) DEFAULT 'Medium',
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        is_archived BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
          ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT NULL;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS intelligence_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        category VARCHAR(100) NOT NULL,
        lesson TEXT NOT NULL,
        source_context TEXT,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
      
      -- Seeding
      INSERT INTO users (id, dob_hash, pin_hash, q1_hash, q2_hash, q3_hash)
      VALUES ('00000000-0000-0000-0000-000000000000', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[DB] Grid: Schema Synchronized.');
}

export { pool, sqliteDb };
