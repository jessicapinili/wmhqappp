-- Migration 007: Add missed_days column to clear_the_fears_progress
-- Safe to re-run (uses ADD COLUMN IF NOT EXISTS).
-- Run in Supabase SQL Editor.

ALTER TABLE clear_the_fears_progress
  ADD COLUMN IF NOT EXISTS missed_days JSONB DEFAULT '[]';
