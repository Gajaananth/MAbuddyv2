import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Global SSL Bypass: Required for certain Supabase/Vercel certificate chains.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let isPostgresActive = false;
let isInitializing = false;

// Ensure DATABASE_URL is present before initializing the pool to prevent startup crashes.
let pool: any = null;

function getPool() {
  if (pool) return pool;
  
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.warn('[DB] CRITICAL: DATABASE_URL is empty. Grid disconnected.');
    return null;
  }

  console.log('[DB] Initializing PostgreSQL Pool (Supabase Focused)...');
  
  const isVercel = !!process.env.VERCEL;
  
  const dbConfig: any = {
    connectionString,
    max: isVercel ? 2 : 20, // Low pool size for serverless to prevent exhaustion
    idleTimeoutMillis: isVercel ? 1000 : 30000, // Drop connections quickly on Vercel
    connectionTimeoutMillis: 10000,
  };

  // Explicitly force SSL for Supabase if URL contains it or if not on Vercel
  if (connectionString.includes('supabase.com') || !process.env.VERCEL) {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
  
  pool = new Pool(dbConfig);
  pool.on('connect', () => console.log('[DB] PostgreSQL: Connection Pipeline Established.'));
  pool.on('error', (err: any) => {
    console.error('[DB] PostgreSQL Pool Error:', err.message);
  });
  
  return pool;
}

let initPromise: Promise<void> | null = null;

/**
 * Initialize Database with Resilience.
 */
async function initDatabase(): Promise<void> {
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
        runMigrations(pool).catch(err => {
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
      
      throw new Error(`[Zium Nova] Database Grid Failure/Timeout: ${error.message}`);
    }
  })();

  return initPromise;
}

/**
 * Optimized Migration Protocol
 */
async function runMigrations(pool: any) {
    console.log('[DB] Grid: Requesting Advisory Lock for Protocol Synchronization...');
    const client = await pool.connect();
    let lockAcquired = false;
    try {
      const lockRes = await client.query('SELECT pg_try_advisory_lock(1001) as got_lock');
      lockAcquired = lockRes.rows[0].got_lock;
      
      if (!lockAcquired) {
          console.log('[DB] Grid: Another instance is syncing schema. Skipping migration run.');
          return;
      }
      
      console.log('[DB] Grid: Acquired Lock. Synchronizing Protocol Tables...');
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
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
          ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

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

      CREATE TABLE IF NOT EXISTS improvement_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        cycle_id VARCHAR(100) NOT NULL,
        insight TEXT NOT NULL,
        strategy_adjustment TEXT DEFAULT '',
        performance_delta TEXT DEFAULT '',
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_identifier TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        os_type TEXT,
        public_key TEXT,
        credential_id TEXT,
        counter INTEGER DEFAULT 0,
        current_challenge TEXT,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        subscription_data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(device_id)
      );

      CREATE TABLE IF NOT EXISTS intelligence_raids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        category VARCHAR(100) NOT NULL,
        risk_level VARCHAR(10) DEFAULT 'Medium',
        source_platform VARCHAR(255),
        content TEXT,
        summary TEXT,
        tags JSONB DEFAULT '[]',
        metadata JSONB DEFAULT NULL,
        ride_type VARCHAR(20) DEFAULT 'mid-week',
        opportunity_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS weekly_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        report_data JSONB NOT NULL,
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        ride_type VARCHAR(20) DEFAULT 'end-week',
        opportunity_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS agent_network (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        capabilities JSONB DEFAULT '[]',
        trust_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        last_collaboration TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS agent_activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(100) DEFAULT 'ZIUM_NOVA',
        action_type VARCHAR(100) NOT NULL,
        platform VARCHAR(100),
        details TEXT,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trend_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        topic VARCHAR(255) NOT NULL,
        analysis JSONB NOT NULL,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_improvement_logs_user ON improvement_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_title ON notifications(user_id, title, created_at);
      CREATE INDEX IF NOT EXISTS idx_raids_user_category ON intelligence_raids(user_id, category, created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_weekly_reports_user ON weekly_reports(user_id);
      
      -- Emergency Data Recovery Protocol (v4.0.2)
      -- Definitive User ID: a1a2ccc0-c3fb-48fc-a440-12192a80d87d
      
      UPDATE conversations 
      SET user_id = 'a1a2ccc0-c3fb-48fc-a440-12192a80d87d' 
      WHERE user_id = 'default_user' 
         OR user_id = 'a1a2ccc0-c3fb-48fc-a440-121922a80d87' 
         OR user_id IS NULL;

      UPDATE intelligence_raids
      SET user_id = 'a1a2ccc0-c3fb-48fc-a440-12192a80d87d'
      WHERE user_id = 'default_user' 
         OR user_id = 'a1a2ccc0-c3fb-48fc-a440-121922a80d87'
         OR user_id IS NULL;

      UPDATE weekly_reports
      SET user_id = 'a1a2ccc0-c3fb-48fc-a440-12192a80d87d'
      WHERE user_id = 'default_user'
         OR user_id = 'a1a2ccc0-c3fb-48fc-a440-121922a80d87'
         OR user_id IS NULL;

      -- Ensure Root persists
      INSERT INTO users (id, dob_hash, pin_hash, q1_hash, q2_hash, q3_hash)
      VALUES ('00000000-0000-0000-0000-000000000000', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[DB] Grid: Schema Synchronized.');
    } finally {
      if (lockAcquired) {
          await client.query('SELECT pg_advisory_unlock(1001)');
          console.log('[DB] Grid: Advisory Lock Released.');
      }
      client.release();
    }
}

const db = {
    get pool() { return pool; },
    get isPostgresActive() { return isPostgresActive; },
    initDatabase,
    getPool
};

export default db;
export { pool, isPostgresActive, initDatabase, getPool };
