-- =====================================================
-- 012 — Quick Links: pin to Dashboard
-- Additive only. Existing rows default to not pinned.
-- =====================================================

ALTER TABLE quick_links ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
