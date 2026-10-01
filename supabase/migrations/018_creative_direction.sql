-- =====================================================
-- 018 — Creative Direction
-- ADDITIVE ONLY. Adds one nullable column to two existing tables.
-- No existing column is altered and no row is changed.
--
-- Holds the optional creative direction a member brainstorms against a revenue
-- event: concept, buyer moment, core message, hooks, offer, visual direction,
-- activation ideas, low budget version and inspiration. Stored as JSONB so the
-- set of prompts can grow later without another migration, matching how
-- business_focus.data already works.
--
-- The same column exists on launches so the answers carry across when a member
-- converts a revenue event into a launch campaign.
-- =====================================================

ALTER TABLE revenue_events ADD COLUMN IF NOT EXISTS creative_direction JSONB;
ALTER TABLE launches       ADD COLUMN IF NOT EXISTS creative_direction JSONB;
