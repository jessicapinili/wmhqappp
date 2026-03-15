-- Migration 004: Ensure all core tables exist
-- Run this in Supabase SQL Editor if any of these tables are missing.
-- All statements use CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- so this is safe to re-run.

-- ── INCOME STRUCTURE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_structure (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recurring_pct NUMERIC DEFAULT 0,
  onetime_pct   NUMERIC DEFAULT 0,
  passive_pct   NUMERIC DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE income_structure ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'income_structure' AND policyname = 'Users can manage own income structure'
  ) THEN
    CREATE POLICY "Users can manage own income structure"
      ON income_structure FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── CASH FORECAST MONTHS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_forecast_months (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year           INTEGER NOT NULL,
  month          INTEGER NOT NULL,
  planned_amount NUMERIC DEFAULT 0,
  is_manual      BOOLEAN DEFAULT FALSE,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE cash_forecast_months ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_forecast_months' AND policyname = 'Users can manage own cash forecast'
  ) THEN
    CREATE POLICY "Users can manage own cash forecast"
      ON cash_forecast_months FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── LAUNCHES ─────────────────────────────────────────────────────────────────
-- Column names match what Cash.jsx LaunchOverview and Launches.jsx both use:
-- offer_name, offer_type, revenue_achieved, enrolled_count
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

-- Add year column if table existed without it (from migration 002)
ALTER TABLE launches ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS revenue_achieved NUMERIC DEFAULT 0;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS enrolled_count   INTEGER DEFAULT 0;

-- Backfill year from start_date for any existing rows
UPDATE launches
SET year = EXTRACT(YEAR FROM (start_date || 'T00:00:00')::TIMESTAMPTZ)::INTEGER
WHERE year IS NULL AND start_date IS NOT NULL AND start_date != '';

-- Defaults for any NULLs
UPDATE launches SET revenue_achieved = 0 WHERE revenue_achieved IS NULL;
UPDATE launches SET enrolled_count   = 0 WHERE enrolled_count   IS NULL;

ALTER TABLE launches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'launches' AND policyname = 'Users can manage own launches'
  ) THEN
    CREATE POLICY "Users can manage own launches"
      ON launches FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── OBJECTION BANK ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS objection_bank (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  objection  TEXT,
  reframe    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE objection_bank ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objection_bank' AND policyname = 'Users can manage own objection bank'
  ) THEN
    CREATE POLICY "Users can manage own objection bank"
      ON objection_bank FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
