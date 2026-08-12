-- =====================================================
-- 015 — Launch Campaigns
-- ADDITIVE ONLY. No column is dropped, renamed or overwritten.
-- Existing launches keep offer_name, offer_type, status, start_date, end_date,
-- revenue_goal, revenue_achieved, enrolled_count, capacity and notes exactly
-- as they are. Every new column is nullable so historical records stay valid.
-- =====================================================

-- ── New campaign fields on the existing launches table ──
ALTER TABLE launches ADD COLUMN IF NOT EXISTS campaign_stage      TEXT;  -- null = derive from legacy status
ALTER TABLE launches ADD COLUMN IF NOT EXISTS campaign_model      TEXT;  -- null = derive from legacy offer_type
ALTER TABLE launches ADD COLUMN IF NOT EXISTS primary_goal        TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS offer_one_liner     TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS campaign_link       TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS currency            TEXT;  -- null = display as AUD

-- Campaign review answers (the legacy `notes` column is left untouched and is
-- surfaced in the app as "Previous Notes & Reflections").
ALTER TABLE launches ADD COLUMN IF NOT EXISTS review_what_worked  TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS review_most_sales   TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS review_hesitation   TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS review_repeat       TEXT;
ALTER TABLE launches ADD COLUMN IF NOT EXISTS review_change       TEXT;

-- NOTE: legacy status values are intentionally NOT rewritten here. The app maps
-- them at read time (Planning/Upcoming -> Planning, Warming -> Pre-launch,
-- Live -> Open, Closed -> Closed, Evergreen -> Open + Evergreen campaign model)
-- and only writes campaign_stage when a member changes the stage themselves.

-- ── Purchase options (one campaign has many) ──
CREATE TABLE IF NOT EXISTS launch_purchase_options (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  launch_id                  UUID REFERENCES launches(id) ON DELETE CASCADE NOT NULL,
  name                       TEXT NOT NULL,
  payment_structure          TEXT,
  total_sale_value           NUMERIC,
  amount_due_today           NUMERIC,
  number_of_payments         INTEGER,
  amount_per_payment         NUMERIC,
  payment_frequency          TEXT,
  deposit_amount             NUMERIC,
  remaining_balance          NUMERIC,
  remaining_balance_due_date DATE,
  custom_description         TEXT,
  is_primary                 BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE launch_purchase_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own purchase options" ON launch_purchase_options;
CREATE POLICY "Users can manage own purchase options"
  ON launch_purchase_options FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS launch_purchase_options_launch_idx
  ON launch_purchase_options(launch_id, created_at);
