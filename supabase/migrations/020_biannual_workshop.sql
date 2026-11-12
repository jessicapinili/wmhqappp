-- =====================================================
-- 020 — WMHQ Biannual Workshop
-- ADDITIVE ONLY. One brand new table.
-- No existing table is altered, renamed or read from.
-- Nothing a member currently has is touched.
--
-- Stores every workshop answer, note, plan, season map, chosen workshop
-- date and the access-code unlock as simple key/value rows per member.
-- Keys look like "2026-11:influence-review-0", "sessions", "current".
--
-- Privacy: self scoped. A member can only ever read or write her own rows,
-- enforced by row level security rather than by the interface.
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_entries (
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  entry_key   TEXT NOT NULL CHECK (char_length(entry_key) BETWEEN 1 AND 200),
  value       TEXT NOT NULL CHECK (char_length(value) <= 100000),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entry_key)
);

ALTER TABLE workshop_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workshop entries" ON workshop_entries;
CREATE POLICY "Users can manage own workshop entries"
  ON workshop_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
