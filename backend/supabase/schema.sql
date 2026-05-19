-- Run this in your Supabase SQL editor to set up the schema

CREATE TABLE IF NOT EXISTS extractions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT        NOT NULL,
  title         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'failed')),
  image_count   INT         NOT NULL DEFAULT 0,
  colors        JSONB,
  typography    JSONB,
  content_summary JSONB,
  images        JSONB,
  content       JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Run this if table already exists:
-- ALTER TABLE extractions ADD COLUMN IF NOT EXISTS images JSONB;
-- ALTER TABLE extractions ADD COLUMN IF NOT EXISTS content JSONB;

-- Index for listing recent extractions quickly
CREATE INDEX IF NOT EXISTS extractions_created_at_idx ON extractions (created_at DESC);

-- Enable Row Level Security (open for now, lock down when auth is added)
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now"
  ON extractions
  FOR ALL
  USING (true)
  WITH CHECK (true);
