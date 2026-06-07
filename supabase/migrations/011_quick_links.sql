-- =====================================================
-- 011 — Quick Links (private per-member click-through links)
-- Per-user only. RLS matches the app's existing per-user policy pattern.
-- =====================================================

CREATE TABLE IF NOT EXISTS quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name VARCHAR(40) NOT NULL,
  url TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('business', 'personal')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own quick links" ON quick_links;
CREATE POLICY "Users can manage own quick links" ON quick_links FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS quick_links_user_idx ON quick_links(user_id, side, sort_order);
