import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// better-sqlite3 is a native C++ addon — it will be loaded dynamically if needed
// and NEVER on Vercel to avoid runtime crashes.
let sqliteDb: any = null;
export let isPostgresActive = false;
let isInitializing = false;

// Ensure DATABASE_URL is present before initializing the pool to prevent startup crashes.
const dbConfig = {
  connectionString: process.env.DATABASE_URL || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.VERCEL || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = dbConfig.connectionString ? new Pool(dbConfig) : null;

if (!pool) {
  console.warn('[DB] CRITICAL: DATABASE_URL is empty. Grid disconnected.');
} else {
  pool.on('error', (err) => {
    console.error('[DB] PostgreSQL Pool Error:', err);
  });
}

const DB_PATH = path.join(process.cwd(), 'zium_nova.sqlite');

/**
 * Initialize Database with Resilience.
 */
export async function initDatabase(): Promise<void> {
  if (isPostgresActive) return;
  if (isInitializing) return;

  isInitializing = true;
  console.log('[DB] Protocol: Establishing Grid Connection...');

  try {
    if (!pool) throw new Error('DATABASE_URL mission critical environment variable is MISSING.');

    const client = await pool.connect();

    try {
      const schemaCheck = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1");

      if (schemaCheck.rows.length > 0) {
        isPostgresActive = true;
        isInitializing = false;
        console.log('[DB] PostgreSQL Grid: ONLINE (Verified)');
        return;
      }

      console.log('[DB] Grid: Initializing Core Protocol Tables...');
      await client.query(`
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

          CREATE TABLE IF NOT EXISTS intelligence_raids (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL,
            risk_level VARCHAR(10) CHECK (risk_level IN ('Low', 'Medium', 'High')),
            source_platform VARCHAR(100),
            content TEXT NOT NULL,
            summary TEXT,
            tags TEXT[] DEFAULT '{}',
            metadata JSONB DEFAULT NULL,
            ride_type VARCHAR(20) DEFAULT 'mid-week',
            opportunity_score INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS weekly_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            report_data JSONB NOT NULL,
            period_start TIMESTAMPTZ NOT NULL,
            period_end TIMESTAMPTZ NOT NULL,
            ride_type VARCHAR(20) DEFAULT 'end-week',
            opportunity_score INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS trend_analyses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            topic VARCHAR(255) NOT NULL,
            analysis JSONB NOT NULL,
            score NUMERIC(5,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            risk_level VARCHAR(10) DEFAULT 'Medium' CHECK (risk_level IN ('Low', 'Medium', 'High')),
            monetization_potential VARCHAR(20) DEFAULT 'Medium',
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            is_archived BOOLEAN DEFAULT FALSE,
            priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
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
            notifications_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            subscription_data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS agent_network (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            trust_score NUMERIC(5,2) DEFAULT 50,
            capabilities TEXT[] DEFAULT '{}',
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'flagged')),
            description TEXT DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_collaboration TIMESTAMPTZ DEFAULT NULL
          );

          CREATE TABLE IF NOT EXISTS agent_activity_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id VARCHAR(50) DEFAULT 'ZIUM_NOVA',
            action_type VARCHAR(50) NOT NULL,
            platform VARCHAR(100),
            details TEXT NOT NULL,
            metadata JSONB DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_trends_created ON trend_analyses(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_agents_trust ON agent_network(trust_score DESC);
          CREATE INDEX IF NOT EXISTS idx_raids_category ON intelligence_raids(category);
          CREATE INDEX IF NOT EXISTS idx_raids_created ON intelligence_raids(created_at DESC);
        `);
      isPostgresActive = true;
      console.log('[DB] PostgreSQL Grid: ONLINE');
    } finally {
      client.release();
      isInitializing = false;
    }
  } catch (error: any) {
    isInitializing = false;
    console.error('[DB] Grid Failure:', error.message);

    if (process.env.VERCEL || (process.env.DATABASE_URL && process.env.NODE_ENV === 'production')) {
      throw new Error(`[Zium Nova] Database Grid Timeout: ${error.message}`);
    }

    console.warn('[DB] Activating Local Shadow Logic.');
    isPostgresActive = false;
  }
}

export { pool, sqliteDb };
