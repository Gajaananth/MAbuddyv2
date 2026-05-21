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
    max: isVercel ? 10 : 20, // Increased pool size for serverless resilience
    idleTimeoutMillis: isVercel ? 5000 : 30000, // Keep connections alive slightly longer on Vercel
    connectionTimeoutMillis: 10000,
  };

  // Explicitly force SSL for Supabase if URL contains it or if not on Vercel
  if (connectionString.includes('supabase.com') || connectionString.includes('supabase.co') || !process.env.VERCEL) {
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
        
        // Blocking Migration: Ensure schema is synchronized before resolving
        // This is critical for Serverless (Vercel) persistence.
        await runMigrations(pool);
      } finally {
        client.release();
      }
    } catch (error: any) {
      initPromise = null; // Allow retry on failure
      console.error('[DB] CRITICAL: Grid Connection Failed.');
      console.error('[DB] ERROR DETAILS:', error.message);
      
      // Improved diagnostics for paused Supabase projects
      if (error.message.includes('ENOTFOUND') && error.message.includes('supabase.co')) {
        console.warn('\n[DB] PROJECT PAUSED? Detected DNS failure for Supabase. Restore the project at: https://supabase.com/dashboard/project/xotpvugfzaqjcdsyctng\n');
      }
      
      if (error.stack) console.error('[DB] ERROR STACK:', error.stack);
      
      throw new Error(`[Karuppu] Database Grid Failure/Timeout: ${error.message}`);
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
      const lockRes = await client.query('SELECT pg_try_advisory_lock(1002) as got_lock');
      lockAcquired = lockRes.rows[0].got_lock;
      
      if (!lockAcquired) {
          console.log('[DB] Grid: Schema synchronization in progress. Proceeding with caution.');
          // If we can't get the lock, we still try to run IF NOT EXISTS for safety
      }
      
      console.log('[DB] Grid: Synchronizing Protocol Tables...');
      await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
      -- Master Intelligence Pipeline Task Support (v5.0.0)
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        task_id_str VARCHAR(10) NOT NULL,
        task_name TEXT NOT NULL,
        owner VARCHAR(20) DEFAULT 'Karuppu' CHECK (owner IN ('OPERATOR', 'Karuppu', 'SHARED')),
        status VARCHAR(20) DEFAULT 'TODO',
        priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        duration VARCHAR(20) DEFAULT 'MEDIUM' CHECK (duration IN ('SHORT', 'MEDIUM', 'LONG')),
        action_plan TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        is_archived BOOLEAN DEFAULT FALSE,
        deadline TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, task_id_str)
      );

      DO $$ 
      BEGIN 
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'owner') THEN
          ALTER TABLE tasks ADD COLUMN owner VARCHAR(20) DEFAULT 'Karuppu';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'duration') THEN
          ALTER TABLE tasks ADD COLUMN duration VARCHAR(20) DEFAULT 'MEDIUM';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deadline') THEN
          ALTER TABLE tasks ADD COLUMN deadline TIMESTAMPTZ DEFAULT NULL;
        END IF;

        -- Migrating assigned_to to owner if assigned_to exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
          UPDATE tasks SET owner = 'OPERATOR' WHERE assigned_to = 'BUDDY';
          UPDATE tasks SET owner = 'Karuppu' WHERE assigned_to = 'Karuppu' OR assigned_to = 'Karuppu';
          -- Final cleanup will happen in code, but this moves data over
        END IF;
      END $$;

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'action_plan') THEN
          ALTER TABLE tasks ADD COLUMN action_plan TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_archived') THEN
          ALTER TABLE tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
          ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_archived') THEN
          ALTER TABLE notifications ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
          ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
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
        agent_id VARCHAR(100) DEFAULT 'ZIUM_Karuppu',
        action_type VARCHAR(100) NOT NULL,
        platform VARCHAR(100),
        details TEXT,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        actor VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
        details TEXT,
        metadata JSONB DEFAULT null,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_audit_logs(event_type);

      CREATE TABLE IF NOT EXISTS trend_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        topic VARCHAR(255) NOT NULL,
        cluster VARCHAR(100) DEFAULT 'CORE',
        analysis JSONB NOT NULL,
        score INTEGER DEFAULT 0,
        metadata JSONB DEFAULT null,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_analyses' AND column_name = 'cluster') THEN
          ALTER TABLE trend_analyses ADD COLUMN cluster VARCHAR(100) DEFAULT 'CORE';
        END IF;
      END $$;

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
      WHERE user_id = 'a1a2ccc0-c3fb-48fc-a440-121922a80d87'
         OR user_id IS NULL;

      UPDATE weekly_reports
      SET user_id = 'a1a2ccc0-c3fb-48fc-a440-12192a80d87d'
      WHERE user_id = 'a1a2ccc0-c3fb-48fc-a440-121922a80d87'
         OR user_id IS NULL;

      -- Ensure Root persists
      INSERT INTO users (id, dob_hash, pin_hash, q1_hash, q2_hash, q3_hash)
      VALUES ('00000000-0000-0000-0000-000000000000', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT', 'SYSTEM_ROOT')
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS earnings_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id VARCHAR(100) NOT NULL,
        platform VARCHAR(100) NOT NULL,
        reward NUMERIC(10, 4) NOT NULL DEFAULT 0,
        execution_time INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_earnings_platform ON earnings_log(platform);

      CREATE TABLE IF NOT EXISTS learning_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        context JSONB DEFAULT NULL,
        outcome VARCHAR(50) NOT NULL,
        score NUMERIC(10, 4) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);

      CREATE TABLE IF NOT EXISTS opportunities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        source VARCHAR(255),
        score NUMERIC(10, 4) DEFAULT 0,
        estimated_reward NUMERIC(10, 4) DEFAULT 0,
        estimated_effort VARCHAR(50),
        status VARCHAR(50) DEFAULT 'NEW',
        recommended_action TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_opportunities_user ON opportunities(user_id);

      CREATE TABLE IF NOT EXISTS automation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        goal TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        current_step INTEGER DEFAULT 0,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_automation_runs_user ON automation_runs(user_id);

      CREATE TABLE IF NOT EXISTS execution_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_execution_sessions_user ON execution_sessions(user_id);

      CREATE TABLE IF NOT EXISTS execution_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        session_id UUID,
        action_type TEXT,
        action_data JSONB,
        result TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_execution_logs_user ON execution_logs(user_id);

      -- ==========================================
      -- Raid Status Table for Persistent Progress
      -- ==========================================
      CREATE TABLE IF NOT EXISTS raid_status (
        user_id UUID PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'idle',
        current_cluster TEXT DEFAULT '',
        clusters_completed INT DEFAULT 0,
        total_clusters INT DEFAULT 5,
        last_started TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ✅ RLS: Only disable if currently enabled to prevent unnecessary locks
      DO $rls$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks' AND rowsecurity = true) THEN
          ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true) THEN
          ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations' AND rowsecurity = true) THEN
          ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages' AND rowsecurity = true) THEN
          ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications' AND rowsecurity = true) THEN
          ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'intelligence_logs' AND rowsecurity = true) THEN
          ALTER TABLE intelligence_logs DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'improvement_logs' AND rowsecurity = true) THEN
          ALTER TABLE improvement_logs DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'devices' AND rowsecurity = true) THEN
          ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND rowsecurity = true) THEN
          ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'intelligence_raids' AND rowsecurity = true) THEN
          ALTER TABLE intelligence_raids DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_reports' AND rowsecurity = true) THEN
          ALTER TABLE weekly_reports DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_network' AND rowsecurity = true) THEN
          ALTER TABLE agent_network DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_activity_logs' AND rowsecurity = true) THEN
          ALTER TABLE agent_activity_logs DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_audit_logs' AND rowsecurity = true) THEN
          ALTER TABLE security_audit_logs DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trend_analyses' AND rowsecurity = true) THEN
          ALTER TABLE trend_analyses DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'earnings_log' AND rowsecurity = true) THEN
          ALTER TABLE earnings_log DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_events' AND rowsecurity = true) THEN
          ALTER TABLE learning_events DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'opportunities' AND rowsecurity = true) THEN
          ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_runs' AND rowsecurity = true) THEN
          ALTER TABLE automation_runs DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'execution_sessions' AND rowsecurity = true) THEN
          ALTER TABLE execution_sessions DISABLE ROW LEVEL SECURITY;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'execution_logs' AND rowsecurity = true) THEN
          ALTER TABLE execution_logs DISABLE ROW LEVEL SECURITY;
        END IF;
      END $rls$;
    `);
    console.log('[DB] Grid: Schema Synchronized.');
    } finally {
      try {
          if (lockAcquired) {
              await client.query('SELECT pg_advisory_unlock(1002)');
              console.log('[DB] Grid: Advisory Lock Released.');
          }
      } catch (e) {
          console.error('[DB] Grid: Failed to release advisory lock.', e);
      } finally {
          client.release();
      }
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
