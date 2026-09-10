-- =====================================================
-- 016 — WMHQ 30 Day Content Challenge
-- ADDITIVE ONLY. Three brand new tables.
-- No existing table is altered, renamed or read from.
-- Nothing a member currently has is touched.
--
-- Privacy: every table is self scoped. A member can only ever read or write
-- her own rows, enforced by row level security rather than by the interface,
-- so querying the tables directly returns nothing belonging to anyone else.
-- =====================================================

-- ── A round. One member may run several over time. ──
CREATE TABLE IF NOT EXISTS content_challenge_rounds (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_date  DATE NOT NULL,
  ended_at    TIMESTAMPTZ,          -- set when she restarts; null means active
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_challenge_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own challenge rounds" ON content_challenge_rounds;
CREATE POLICY "Users can manage own challenge rounds"
  ON content_challenge_rounds FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS content_challenge_rounds_user_idx
  ON content_challenge_rounds(user_id, created_at DESC);

-- ── One row per member per calendar day. ──
CREATE TABLE IF NOT EXISTS content_challenge_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  round_id    UUID REFERENCES content_challenge_rounds(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE NOT NULL,
  youtube     INTEGER NOT NULL DEFAULT 0 CHECK (youtube   BETWEEN 0 AND 30),
  instagram   INTEGER NOT NULL DEFAULT 0 CHECK (instagram BETWEEN 0 AND 30),
  tiktok      INTEGER NOT NULL DEFAULT 0 CHECK (tiktok    BETWEEN 0 AND 30),
  total       INTEGER GENERATED ALWAYS AS (youtube + instagram + tiktok) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE content_challenge_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own challenge logs" ON content_challenge_logs;
CREATE POLICY "Users can manage own challenge logs"
  ON content_challenge_logs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS content_challenge_logs_round_idx
  ON content_challenge_logs(round_id, log_date);

-- Future dates and out of window dates are rejected in the database, not just
-- hidden in the interface. This has to be a trigger rather than a CHECK
-- constraint, because Postgres will not allow CURRENT_DATE inside a CHECK.
CREATE OR REPLACE FUNCTION content_challenge_validate_log()
RETURNS TRIGGER AS $$
DECLARE
  round_start DATE;
BEGIN
  IF NEW.log_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot log posts for a day that has not arrived yet';
  END IF;

  -- Row level security applies to this lookup, so a round belonging to another
  -- member simply is not found and the write is refused.
  SELECT start_date INTO round_start
    FROM content_challenge_rounds WHERE id = NEW.round_id;

  IF round_start IS NULL THEN
    RAISE EXCEPTION 'Challenge round not found';
  END IF;

  IF NEW.log_date < round_start OR NEW.log_date > round_start + 29 THEN
    RAISE EXCEPTION 'That day falls outside the thirty day window';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_challenge_logs_validate ON content_challenge_logs;
CREATE TRIGGER content_challenge_logs_validate
  BEFORE INSERT OR UPDATE ON content_challenge_logs
  FOR EACH ROW EXECUTE FUNCTION content_challenge_validate_log();

-- ── Visibility Data. Her own content, both lists. ──
CREATE TABLE IF NOT EXISTS content_challenge_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  round_id    UUID REFERENCES content_challenge_rounds(id) ON DELETE CASCADE NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('best', 'performing')),
  url         TEXT,
  platform    TEXT,
  note        TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_challenge_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own challenge notes" ON content_challenge_notes;
CREATE POLICY "Users can manage own challenge notes"
  ON content_challenge_notes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS content_challenge_notes_round_idx
  ON content_challenge_notes(round_id, kind, sort_order);

-- ── Clear a finished round twelve months after its last day. ──
-- Same pg_cron pattern as 009_brain_dump.sql and 010_focus_yearly_reset.sql.
-- The member is shown the clear date on each archived round beforehand, so
-- nothing disappears without warning and she can save her PDF first.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('content-challenge-archive-clear');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'content-challenge-archive-clear',
  '45 3 * * *',
  $$
    DELETE FROM content_challenge_rounds
     WHERE start_date + 29 < CURRENT_DATE - INTERVAL '12 months';
  $$
);
