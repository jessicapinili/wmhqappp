-- =====================================================
-- 009 — Daily Brain Dump
-- Per-user release valve. Entries vanish at the member's local midnight (by design).
-- =====================================================

CREATE TABLE IF NOT EXISTS brain_dump_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  body VARCHAR(120) NOT NULL CHECK (char_length(body) <= 120),
  done BOOLEAN DEFAULT FALSE,
  local_date DATE NOT NULL,
  tz_offset_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brain_dump_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own brain dump" ON brain_dump_entries;
CREATE POLICY "Users can manage own brain dump" ON brain_dump_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brain_dump_entries_user_date_idx ON brain_dump_entries(user_id, local_date);

-- Hourly cleanup: hard-delete entries once it is a new calendar day in the member's
-- own timezone. The UI never shows non-today entries, so this is the backstop that
-- makes them unrecoverable. Runs hourly to catch each timezone's local midnight.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('brain-dump-clear');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'brain-dump-clear',
  '0 * * * *',
  $$DELETE FROM public.brain_dump_entries
    WHERE ((now() AT TIME ZONE 'UTC') - make_interval(mins => tz_offset_minutes))::date > local_date$$
);
