-- Migration: Add missing tables referenced in the application code
-- Run this in Supabase SQL Editor
-- Tables: income_structure, cash_forecast_months, launches, objection_bank


-- ── INCOME STRUCTURE (Cash) ───────────────────────────────
CREATE TABLE IF NOT EXISTS income_structure (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  recurring_pct NUMERIC DEFAULT 0,
  onetime_pct   NUMERIC DEFAULT 0,
  passive_pct   NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income structure" ON income_structure FOR ALL USING (auth.uid() = user_id);


-- ── CASH FORECAST MONTHS (Cash) ──────────────────────────
CREATE TABLE IF NOT EXISTS cash_forecast_months (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  year  INTEGER NOT NULL,
  month INTEGER NOT NULL,
  planned_amount NUMERIC DEFAULT 0,
  is_manual BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE cash_forecast_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cash forecast" ON cash_forecast_months FOR ALL USING (auth.uid() = user_id);


-- ── LAUNCHES (Cash — Launch Overview) ────────────────────
CREATE TABLE IF NOT EXISTS launches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  offer_name       TEXT,
  offer_type       TEXT,
  start_date       TEXT,
  end_date         TEXT,
  revenue_goal     NUMERIC,
  revenue_achieved NUMERIC,
  capacity         INTEGER,
  enrolled_count   INTEGER,
  status           TEXT DEFAULT 'Upcoming',
  notes            TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own launches" ON launches FOR ALL USING (auth.uid() = user_id);


-- ── OBJECTION BANK (Influence) ────────────────────────────
CREATE TABLE IF NOT EXISTS objection_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  objection TEXT,
  reframe   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE objection_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own objection bank" ON objection_bank FOR ALL USING (auth.uid() = user_id);
