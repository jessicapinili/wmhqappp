-- Migration 006: Clear the Fears — 30-day challenge progress table
-- One row per user. current_day is 0-indexed (0 = Day 1, 29 = Day 30, 30 = complete).
-- completed_days is a JSONB array of 0-indexed day integers.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS clear_the_fears_progress (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  current_day    INTEGER DEFAULT 0,
  completed_days JSONB DEFAULT '[]',
  started_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE clear_the_fears_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clear_the_fears_progress'
      AND policyname = 'Users can manage own clear the fears progress'
  ) THEN
    CREATE POLICY "Users can manage own clear the fears progress"
      ON clear_the_fears_progress FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
