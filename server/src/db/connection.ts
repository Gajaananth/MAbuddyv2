import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// better-sqlite3 is a native C++ addon — skip it on Vercel serverless
let Database: any = null;
if (!process.env.VERCEL) {
  try { Database = require('better-sqlite3'); } catch { }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  ssl: process.env.NODE_ENV === 'production' || process.env.VERCEL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('[DB] PostgreSQL Pool Error:', err);
});

const DB_PATH = path.join(process.cwd(), 'zium_nova.sqlite');
let sqliteDb: any = null;
export let isPostgresActive = false;
let isInitializing = false;

/**
 * Initialize Database with Resilience.
 */
export async function initDatabase(): Promise<void> {
  if (isPostgresActive) return;
  if (isInitializing) return;

  isInitializing = true;
  console.log('[DB] Protocol: Establishing Grid Connection...');

  try {
    // Wrap connection in a promise to control timeout explicitly if needed
    // pg Pool connectionTimeoutMillis already helps, but we add more logging here
    const client = await pool.connect();

    try {
      // Fast check for existing schema to avoid cold-start lag
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
      console.log('[DB] PostgreSQL Grid: ONLINE (Standard Ready)');
    } finally {
      client.release();
      isInitializing = false;
    }
  } catch (error: any) {
    isInitializing = false;
    console.error('[DB] Grid Failure:', error.message);

    // In Vercel, if DB fails, we must throw so the operator knows why
    if (process.env.VERCEL || (process.env.DATABASE_URL && process.env.NODE_ENV === 'production')) {
      throw new Error(`[Zium Nova] Database Grid Timeout: ${error.message}`);
    }

    // Local Fallback
    console.warn('[DB] Grid Unavailable. Activating Local Shadow (SQLite).');
    isPostgresActive = false;
    if (Database) initSQLite();
  }
}

function initSQLite() {
  if (!Database) return;
  sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            dob_hash TEXT NOT NULL,
            pin_hash TEXT NOT NULL,
            q1_hash TEXT NOT NULL,
            q2_hash TEXT NOT NULL,
            q3_hash TEXT NOT NULL,
            failed_attempts INTEGER DEFAULT 0,
            lock_until DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Conversation',
            topic_tag TEXT DEFAULT NULL,
            is_deleted INTEGER DEFAULT 0,
            user_id TEXT DEFAULT 'default_user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_identifier TEXT NOT NULL,
            fingerprint TEXT NOT NULL,
            os_type TEXT,
            public_key TEXT,
            credential_id TEXT,
            notifications_enabled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
  `);
  console.log('[DB] Local Shadow: ACTIVE');
}

export { pool, sqliteDb };
