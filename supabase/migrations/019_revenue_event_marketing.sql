-- =====================================================
-- 019 — Marketing channels on revenue events
-- ADDITIVE ONLY. One nullable column on one existing table.
-- No existing column is altered and no row is changed.
--
-- Holds where a revenue event will be promoted or delivered:
--   { "channels": ["Instagram", "Email marketing"], "primary": "Instagram" }
--
-- JSONB so the channel list can grow, and so a member's own channels sit
-- alongside the standard ones without another migration.
-- =====================================================

ALTER TABLE revenue_events ADD COLUMN IF NOT EXISTS marketing JSONB;
