-- Run this in the Supabase Dashboard → SQL Editor
--
-- This schema sets up four tables:
--   1. presets         — saved preset library (per user)
--   2. songs           — full project saves with size/duration tracking
--   3. profile_settings — per-user preferences (theme, default BPM, …)
--   4. signup_attempts  — for IP-based rate limiting on account creation
--
-- All tables use Row Level Security so users can only access their own rows.

-- ════════════════════════════════════════════════════════════════════════
-- PRESETS
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS presets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS presets_user_id_idx       ON presets (user_id);
CREATE INDEX IF NOT EXISTS presets_user_created_idx  ON presets (user_id, created_at DESC);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own presets" ON presets;
DROP POLICY IF EXISTS "insert own presets" ON presets;
DROP POLICY IF EXISTS "delete own presets" ON presets;

CREATE POLICY "select own presets" ON presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own presets" ON presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own presets" ON presets FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- SONGS  — full project files (tracks + blocks + settings) saved as JSON
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS songs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  data        JSONB       NOT NULL,
  duration    REAL        NOT NULL DEFAULT 0,
  size_bytes  INTEGER     NOT NULL DEFAULT 0,
  decade      TEXT        NOT NULL DEFAULT '80s',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS songs_user_id_idx      ON songs (user_id);
CREATE INDEX IF NOT EXISTS songs_user_created_idx ON songs (user_id, created_at DESC);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own songs" ON songs;
DROP POLICY IF EXISTS "insert own songs" ON songs;
DROP POLICY IF EXISTS "update own songs" ON songs;
DROP POLICY IF EXISTS "delete own songs" ON songs;

CREATE POLICY "select own songs" ON songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own songs" ON songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own songs" ON songs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own songs" ON songs FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- PROFILE SETTINGS
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profile_settings (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name   TEXT,
  decade_theme   TEXT        NOT NULL DEFAULT '80s',
  preferences    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_premium     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own profile" ON profile_settings;
DROP POLICY IF EXISTS "insert own profile" ON profile_settings;
DROP POLICY IF EXISTS "update own profile" ON profile_settings;

CREATE POLICY "select own profile" ON profile_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON profile_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON profile_settings FOR UPDATE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- SIGNUP RATE LIMITING
-- For real protection, also enable Supabase's built-in rate limits in Auth
-- settings. This table backs an extra application-level check.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS signup_attempts (
  id           BIGSERIAL   PRIMARY KEY,
  ip_hash      TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signup_attempts_ip_time_idx
  ON signup_attempts (ip_hash, attempted_at DESC);

-- Helper RPC: returns TRUE if the caller may sign up (≤ 3 / hour)
CREATE OR REPLACE FUNCTION can_sign_up(p_ip_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO attempt_count
    FROM signup_attempts
    WHERE ip_hash = p_ip_hash
      AND attempted_at > NOW() - INTERVAL '1 hour';
  RETURN attempt_count < 3;
END;
$$;
