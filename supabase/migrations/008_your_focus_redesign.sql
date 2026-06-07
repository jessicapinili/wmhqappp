-- =====================================================
-- 008 — "Your Focus" redesign (Business + Life Focus)
-- ADDITIVE ONLY. No columns dropped, no data truncated or overwritten.
-- =====================================================

-- 1) Life Focus: persisted done state (defaults false; existing rows unaffected)
ALTER TABLE life_focus ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE;

-- 2) Business Focus notes thread
--    One note = plain text, max 150 chars (enforced in DB), stamped with created_at.
--    Cascades with its parent focus and with the user. RLS matches existing per-user policy.
CREATE TABLE IF NOT EXISTS business_focus_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  focus_id UUID REFERENCES business_focus(id) ON DELETE CASCADE NOT NULL,
  body VARCHAR(150) NOT NULL CHECK (char_length(body) <= 150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_focus_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own business focus notes" ON business_focus_notes;
CREATE POLICY "Users can manage own business focus notes"
  ON business_focus_notes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS business_focus_notes_focus_id_idx ON business_focus_notes(focus_id);

-- NOTE: business_focus priority / current / target are stored additively inside the
-- existing `data` JSONB column (consistent with how this table already stores all
-- focus content). No DDL or backfill is required; existing records are mapped to the
-- new format at read time and the new keys are written on the next save or reorder.
