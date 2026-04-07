-- ilkda schema — run with: npm run db:migrate
-- should be safe to re-run (uses IF NOT EXISTS everywhere)

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id   UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  username   CITEXT   UNIQUE NOT NULL,-- case-insensitive text
  name   TEXT   NOT NULL,
  password   TEXT   NOT NULL,
  bio   TEXT   NOT NULL DEFAULT '',
  avatar   TEXT, -- base64 data URL
  joined_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
  id   UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type   TEXT   NOT NULL CHECK (type IN ('anime','tv','movie','manga','book','game','album')),
  title   TEXT   NOT NULL,
  status   TEXT   NOT NULL DEFAULT 'planning'
                          CHECK (status IN ('planning','in-progress','completed','on-hold','dropped')),
  progress  TEXT   NOT NULL DEFAULT '',
  score   SMALLINT    NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10),
  notes  TEXT  NOT NULL DEFAULT '',
  image   TEXT,   -- base64 data URL
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(user_id, updated_at DESC);

-- auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entries_updated_at ON entries;
CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- adding desc column (idempotent)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- adding year col (idempotent)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS year SMALLINT DEFAULT NULL;

-- adding creator col (idempotent)
-- author (manga, book), studio (tv, anime), etc
ALTER TABLE entries ADD COLUMN IF NOT EXISTS creator TEXT NOT NULL DEFAULT '';

-- adding pinned entries col (idempotent)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- indexing so fetching pinned entries is fast
CREATE INDEX IF NOT EXISTS idx_entries_pinned ON entries(user_id, pinned) WHERE pinned = TRUE;

-- ading isbn and pages col (idempotent)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS isbn  TEXT  DEFAULT NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS pages SMALLINT DEFAULT NULL;

-- adding tracks col (idempotent)
-- stores album track list with checked state: [{id, trackNumber, name, durationMs, checked}]
ALTER TABLE entries ADD COLUMN IF NOT EXISTS tracks JSONB NOT NULL DEFAULT '[]';

-- adding seasons col (idempotent)
-- stores tv szn list: [{number, name, episodeCount, watchedEpisodes, status, score, notes}]
ALTER TABLE entries ADD COLUMN IF NOT EXISTS seasons JSONB NOT NULL DEFAULT '[]';
