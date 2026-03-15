-- Migration 005: Add capacity_checkins table
-- This table was referenced in Dashboard.jsx but never created.
-- date_key stores the Monday (week start) of the check-in week,
-- so each user has one record per week (not per day).
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS capacity_checkins (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date_key   TEXT NOT NULL,
  mode       TEXT,
  energy     INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);

ALTER TABLE capacity_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'capacity_checkins'
      AND policyname = 'Users can manage own capacity checkins'
  ) THEN
    CREATE POLICY "Users can manage own capacity checkins"
      ON capacity_checkins FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
