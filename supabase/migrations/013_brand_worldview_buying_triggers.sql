-- =====================================================
-- 013 — Influence additions: Brand Worldview + Buying Triggers
-- New, separate per-user tables. No existing tables or data touched.
-- =====================================================

-- Brand Worldview: one record per user (the seven belief prompts).
CREATE TABLE IF NOT EXISTS brand_worldview (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  believe TEXT,
  not_believe TEXT,
  industry_wrong TEXT,
  customers_deserve TEXT,
  old_way TEXT,
  new_way TEXT,
  future TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_worldview ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own brand worldview" ON brand_worldview;
CREATE POLICY "Users can manage own brand worldview" ON brand_worldview FOR ALL USING (auth.uid() = user_id);

-- Buying Triggers: many records per user.
CREATE TABLE IF NOT EXISTS buying_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  trigger TEXT NOT NULL,
  what_this_looks_like TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buying_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own buying triggers" ON buying_triggers;
CREATE POLICY "Users can manage own buying triggers" ON buying_triggers FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS buying_triggers_user_idx ON buying_triggers(user_id, created_at);
