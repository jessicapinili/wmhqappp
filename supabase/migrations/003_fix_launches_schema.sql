-- Migration: Fix launches table schema to match Launches.jsx
-- Run this in Supabase SQL Editor

-- 1. Create the launches table with the correct schema if it doesn't exist yet.
--    (Matches the column names used by Launches.jsx)
CREATE TABLE IF NOT EXISTS launches (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year             INTEGER,
  offer_name       TEXT,
  offer_type       TEXT,
  start_date       TEXT,
  end_date         TEXT,
  revenue_goal     NUMERIC DEFAULT 0,
  revenue_achieved NUMERIC DEFAULT 0,
  capacity         INTEGER,
  enrolled_count   INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'Upcoming',
  notes            TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launches ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'launches' AND policyname = 'Users can manage own launches'
  ) THEN
    CREATE POLICY "Users can manage own launches"
      ON launches FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Add year column if the table already existed without it
ALTER TABLE launches ADD COLUMN IF NOT EXISTS year INTEGER;

-- 3. Backfill year from start_date for existing records that have no year set
UPDATE launches
SET year = EXTRACT(YEAR FROM (start_date || 'T00:00:00')::TIMESTAMPTZ)::INTEGER
WHERE year IS NULL
  AND start_date IS NOT NULL
  AND start_date != '';

-- 4. Ensure revenue_achieved and enrolled_count exist (may have been called
--    revenue_secured / enrolled if the old migration had different names)
ALTER TABLE launches ADD COLUMN IF NOT EXISTS revenue_achieved NUMERIC DEFAULT 0;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS enrolled_count   INTEGER DEFAULT 0;

-- 5. Set defaults for any NULLs so UI calculations don't break
UPDATE launches SET revenue_achieved = 0 WHERE revenue_achieved IS NULL;
UPDATE launches SET enrolled_count   = 0 WHERE enrolled_count   IS NULL;
