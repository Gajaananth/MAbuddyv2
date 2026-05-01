CREATE TABLE IF NOT EXISTS earnings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  reward NUMERIC DEFAULT 0,
  execution_time INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_log_user_id ON earnings_log(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_log_status ON earnings_log(status);
