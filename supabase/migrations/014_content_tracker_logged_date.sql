-- =====================================================
-- 014 — Content Tracker: save the selected day
-- Additive only. Existing entries keep displaying by created_at (logged_date null).
-- =====================================================

ALTER TABLE content_tracker_entries ADD COLUMN IF NOT EXISTS logged_date DATE;
