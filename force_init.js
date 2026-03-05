import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = 'postgresql://postgres.xotpvugfzaqjcdsyctng:2026%21%21Buddy26@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function forceInit() {
    console.log('[FORCE] Connecting to Grid...');
    const client = await pool.connect();
    try {
        console.log('[FORCE] Executing Schema Initialization...');
        await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
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
        console.log('[FORCE] Schema Initialization SUCCESSFUL');

        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('[FORCE] Verified Tables:', tables.rows.map(t => t.table_name));

    } catch (err) {
        console.error('[FORCE] Initialization FAILED:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

forceInit();
