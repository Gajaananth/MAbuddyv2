import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('[DB] PostgreSQL Pool Error:', err);
});

pool.on('connect', () => {
  console.log('[DB] New Client Bound to Grid');
});

const DB_PATH = path.join(process.cwd(), 'zium_nova.sqlite');
let sqliteDb: Database.Database | null = null;
export let isPostgresActive = false;

/**
 * Initialize Database with SQLite Fallback.
 * Production prefers PostgreSQL, but local dev falls back to SQLite for robustness.
 */
export async function initDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
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
    }
  } catch (error: any) {
    console.error('[DB] CRITICAL: PostgreSQL GRID OFFLINE:', error.message);
    if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
      console.error('[DB] EMERGENCY: Local SQLite fallback bypassed in production to prevent data fragmentation.');
      throw error;
    }
    console.warn('[DB] Local Dev Fallback: Activating SQLite.');
    isPostgresActive = false;
    initSQLite();
  }
}

function initSQLite() {
  sqliteDb = new Database(DB_PATH);
  sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Conversation',
            topic_tag TEXT DEFAULT NULL,
            is_deleted INTEGER DEFAULT 0,
            user_id TEXT DEFAULT 'default_user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'nova')),
            content TEXT NOT NULL,
            metadata TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS intelligence_raids (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            category TEXT NOT NULL,
            risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
            source_platform TEXT,
            content TEXT NOT NULL,
            summary TEXT,
            tags TEXT DEFAULT '[]',
            metadata TEXT DEFAULT NULL,
            ride_type TEXT DEFAULT 'mid-week',
            opportunity_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS weekly_reports (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            report_data TEXT NOT NULL,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            ride_type TEXT DEFAULT 'end-week',
            opportunity_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS trend_analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            topic TEXT NOT NULL,
            analysis TEXT NOT NULL,
            score REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            risk_level TEXT DEFAULT 'Medium' CHECK (risk_level IN ('Low', 'Medium', 'High')),
            monetization_potential TEXT DEFAULT 'Medium',
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
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
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            subscription_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS agent_activity_logs (
            id TEXT PRIMARY KEY,
            agent_id TEXT DEFAULT 'ZIUM_NOVA',
            action_type TEXT NOT NULL,
            platform TEXT,
            details TEXT NOT NULL,
            metadata TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

  // Migrate existing tables — add columns that may be missing
  const existingCols = sqliteDb.prepare("PRAGMA table_info(conversations)").all() as any[];
  const colNames = existingCols.map((c: any) => c.name);

  if (!colNames.includes('topic_tag')) {
    sqliteDb.exec("ALTER TABLE conversations ADD COLUMN topic_tag TEXT DEFAULT NULL");
    console.log('[DB] Migration: Added topic_tag column');
  }
  if (!colNames.includes('is_deleted')) {
    sqliteDb.exec("ALTER TABLE conversations ADD COLUMN is_deleted INTEGER DEFAULT 0");
    console.log('[DB] Migration: Added is_deleted column');
  }
  if (!colNames.includes('user_id')) {
    sqliteDb.exec("ALTER TABLE conversations ADD COLUMN user_id TEXT DEFAULT 'default_user'");
    console.log('[DB] Migration: Added user_id column');
  }

  // Intelligence Migration
  const raidCols = sqliteDb.prepare("PRAGMA table_info(intelligence_raids)").all() as any[];
  const raidColNames = raidCols.map((c: any) => c.name);
  if (!raidColNames.includes('ride_type')) {
    sqliteDb.exec("ALTER TABLE intelligence_raids ADD COLUMN ride_type TEXT DEFAULT 'mid-week'");
    sqliteDb.exec("ALTER TABLE intelligence_raids ADD COLUMN opportunity_score INTEGER DEFAULT 0");
    sqliteDb.exec("ALTER TABLE intelligence_raids ADD COLUMN status TEXT DEFAULT 'active'");
    console.log('[DB] Migration: Added metadata columns to intelligence_raids');
  }
  if (!raidColNames.includes('user_id')) {
    sqliteDb.exec("ALTER TABLE intelligence_raids ADD COLUMN user_id TEXT");
    console.log('[DB] Migration: Added user_id column to intelligence_raids');
  }

  const reportCols = sqliteDb.prepare("PRAGMA table_info(weekly_reports)").all() as any[];
  const reportColNames = reportCols.map((c: any) => c.name);
  if (!reportColNames.includes('ride_type')) {
    sqliteDb.exec("ALTER TABLE weekly_reports ADD COLUMN ride_type TEXT DEFAULT 'end-week'");
    sqliteDb.exec("ALTER TABLE weekly_reports ADD COLUMN opportunity_score INTEGER DEFAULT 0");
    sqliteDb.exec("ALTER TABLE weekly_reports ADD COLUMN status TEXT DEFAULT 'active'");
    console.log('[DB] Migration: Added metadata columns to weekly_reports');
  }
  if (!reportColNames.includes('user_id')) {
    sqliteDb.exec("ALTER TABLE weekly_reports ADD COLUMN user_id TEXT");
    console.log('[DB] Migration: Added user_id column to weekly_reports');
  }

  // Trend analyses migration
  const trendCols = sqliteDb.prepare("PRAGMA table_info(trend_analyses)").all() as any[];
  const trendColNames = trendCols.map((c: any) => c.name);
  if (!trendColNames.includes('user_id')) {
    sqliteDb.exec("ALTER TABLE trend_analyses ADD COLUMN user_id TEXT");
    console.log('[DB] Migration: Added user_id column to trend_analyses');
  }

  // Device Migration
  const deviceCols = sqliteDb.prepare("PRAGMA table_info(devices)").all() as any[];
  const deviceColNames = deviceCols.map((c: any) => c.name);
  if (!deviceColNames.includes('notifications_enabled')) {
    sqliteDb.exec("ALTER TABLE devices ADD COLUMN notifications_enabled INTEGER DEFAULT 0");
    console.log('[DB] Migration: Added notifications_enabled column to devices');
  }

  console.log('[DB] SQLite Fallback: ACTIVE at', DB_PATH);
}

export { pool, sqliteDb };
