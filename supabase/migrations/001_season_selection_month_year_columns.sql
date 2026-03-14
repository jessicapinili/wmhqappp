-- Migration: Replace month_year TEXT with separate month/year INT columns
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE season_selection
  ADD COLUMN IF NOT EXISTS month INT,
  ADD COLUMN IF NOT EXISTS year INT;

-- Step 2: Backfill from existing month_year values (format: 'yyyy-MM')
UPDATE season_selection
SET
  year  = SPLIT_PART(month_year, '-', 1)::INT,
  month = SPLIT_PART(month_year, '-', 2)::INT
WHERE month_year IS NOT NULL;

-- Step 3: Make columns NOT NULL
ALTER TABLE season_selection
  ALTER COLUMN month SET NOT NULL,
  ALTER COLUMN year  SET NOT NULL;

-- Step 4: Drop old unique constraint and column
ALTER TABLE season_selection
  DROP CONSTRAINT IF EXISTS season_selection_user_id_month_year_key;

ALTER TABLE season_selection
  DROP COLUMN IF EXISTS month_year;

-- Step 5: Add new unique constraint
ALTER TABLE season_selection
  ADD CONSTRAINT season_selection_user_id_month_year_unique UNIQUE (user_id, month, year);