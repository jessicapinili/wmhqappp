-- ============================================================
-- WMHQ Money Dashboard — Migration 01
-- Additive only. No existing tables, rows, or columns are dropped.
-- Run in the Supabase SQL editor after the original schema.
-- ============================================================

-- ─── New table: baseline_fixed_costs ─────────────────────────────────────────
-- Replaces the 4 flat opex fields (opex_team / opex_software / opex_rent / opex_other)
-- inside money_dashboard_constants.constants_json with proper rows that support
-- per-cost frequency selection (weekly / monthly / quarterly / annually).

CREATE TABLE IF NOT EXISTS baseline_fixed_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequency   TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_fixed_costs_user
  ON baseline_fixed_costs(user_id, sort_order);

ALTER TABLE baseline_fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "baseline_fixed_costs_select_own" ON baseline_fixed_costs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "baseline_fixed_costs_insert_own" ON baseline_fixed_costs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "baseline_fixed_costs_update_own" ON baseline_fixed_costs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "baseline_fixed_costs_delete_own" ON baseline_fixed_costs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_baseline_fixed_costs_updated_at
  BEFORE UPDATE ON baseline_fixed_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── New table: weekly_variable_expenses ──────────────────────────────────────
-- Categorised one-off expense rows per weekly review (Step 4, Block C).
-- Linked to money_dashboard_entries.id (CASCADE delete preserves entry integrity).

CREATE TABLE IF NOT EXISTS weekly_variable_expenses (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id  UUID NOT NULL REFERENCES money_dashboard_entries(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category  TEXT NOT NULL,
  amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_variable_expenses_entry
  ON weekly_variable_expenses(entry_id);

CREATE INDEX IF NOT EXISTS idx_weekly_variable_expenses_user
  ON weekly_variable_expenses(user_id);

ALTER TABLE weekly_variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_variable_expenses_select_own" ON weekly_variable_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "weekly_variable_expenses_insert_own" ON weekly_variable_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weekly_variable_expenses_update_own" ON weekly_variable_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "weekly_variable_expenses_delete_own" ON weekly_variable_expenses
  FOR DELETE USING (auth.uid() = user_id);


-- ─── Data migration: flat opex fields → baseline_fixed_costs rows ────────────
-- All existing opex values were entered as weekly amounts, so frequency = 'weekly'.
-- This preserves the weekly baseline total exactly for all existing users.
-- Only migrates rows with values > 0 (no point creating $0 placeholders).
-- ON CONFLICT DO NOTHING is a safety net in case migration is re-run.

INSERT INTO baseline_fixed_costs (user_id, name, amount, frequency, sort_order)
SELECT user_id, 'Team / contractors', (constants_json->>'opex_team')::NUMERIC, 'weekly', 1
FROM money_dashboard_constants
WHERE (constants_json->>'opex_team') IS NOT NULL
  AND (constants_json->>'opex_team')::NUMERIC > 0
ON CONFLICT DO NOTHING;

INSERT INTO baseline_fixed_costs (user_id, name, amount, frequency, sort_order)
SELECT user_id, 'Software / subscriptions', (constants_json->>'opex_software')::NUMERIC, 'weekly', 2
FROM money_dashboard_constants
WHERE (constants_json->>'opex_software') IS NOT NULL
  AND (constants_json->>'opex_software')::NUMERIC > 0
ON CONFLICT DO NOTHING;

INSERT INTO baseline_fixed_costs (user_id, name, amount, frequency, sort_order)
SELECT user_id, 'Rent / overheads', (constants_json->>'opex_rent')::NUMERIC, 'weekly', 3
FROM money_dashboard_constants
WHERE (constants_json->>'opex_rent') IS NOT NULL
  AND (constants_json->>'opex_rent')::NUMERIC > 0
ON CONFLICT DO NOTHING;

INSERT INTO baseline_fixed_costs (user_id, name, amount, frequency, sort_order)
SELECT user_id, 'Other fixed costs', (constants_json->>'opex_other')::NUMERIC, 'weekly', 4
FROM money_dashboard_constants
WHERE (constants_json->>'opex_other') IS NOT NULL
  AND (constants_json->>'opex_other')::NUMERIC > 0
ON CONFLICT DO NOTHING;


-- ─── preferred_currency default (safety) ──────────────────────────────────────
-- Already set to 'AUD' in original schema; this is a no-op.
ALTER TABLE money_dashboard_settings
  ALTER COLUMN preferred_currency SET DEFAULT 'AUD';
