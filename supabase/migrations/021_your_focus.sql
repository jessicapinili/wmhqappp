-- =====================================================
-- 021 — Your Focus (new)
-- ADDITIVE ONLY. Two brand new tables.
-- No existing table is altered, renamed or deleted. business_focus,
-- life_focus and business_focus_notes stay exactly as they are; the app
-- copies a member's existing focuses into focus_items once, the first time
-- she opens the new Your Focus, and records that in focus_settings.
--
-- Privacy: self scoped. A member can only ever read or write her own rows,
-- enforced by row level security rather than by the interface.
-- =====================================================

CREATE TABLE IF NOT EXISTS focus_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('business', 'life')),
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  goals       TEXT NOT NULL DEFAULT '' CHECK (char_length(goals) <= 5000),
  area        TEXT NOT NULL DEFAULT '' CHECK (char_length(area) <= 60),
  track       TEXT NOT NULL DEFAULT 'check' CHECK (track IN ('check', 'percent', 'number')),
  current     NUMERIC NOT NULL DEFAULT 0,
  target      NUMERIC NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT '' CHECK (char_length(unit) <= 60),
  percent     NUMERIC NOT NULL DEFAULT 0 CHECK (percent BETWEEN 0 AND 100),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'not_completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own focus items" ON focus_items;
CREATE POLICY "Users can manage own focus items"
  ON focus_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS focus_items_user_idx ON focus_items(user_id, created_at);

-- One row per member: preferences + whether old focuses were copied in.
CREATE TABLE IF NOT EXISTS focus_settings (
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  view        TEXT NOT NULL DEFAULT 'cards' CHECK (view IN ('list', 'cards')),
  imported    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own focus settings" ON focus_settings;
CREATE POLICY "Users can manage own focus settings"
  ON focus_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
