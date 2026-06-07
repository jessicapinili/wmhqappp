-- =====================================================
-- 010 — Focus status + yearly reset of finished focuses
-- =====================================================
-- Status control and customer goals are stored additively inside the existing
-- business_focus.data JSONB (manual_status, finished_year, customers_current,
-- customers_target), consistent with how this table already stores focus content.
-- No columns are dropped or overwritten.
--
-- This migration adds only the scheduled yearly reset: on the new calendar year,
-- focuses marked Completed or Not completed are permanently deleted (their notes
-- cascade via the business_focus_notes foreign key). Active focuses are NOT
-- deleted and carry over. finished_year is stamped (member local year) when a
-- focus becomes finished; the app also applies a load-time guard so a member
-- never sees last year's finished focuses even before this job runs.
--
-- A 2-day UTC buffer guarantees every timezone has passed its local 1 Jan before
-- a row is hard-deleted, so nothing vanishes early.

DO $$
BEGIN
  PERFORM cron.unschedule('focus-yearly-reset');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'focus-yearly-reset',
  '30 3 * * *',
  $$DELETE FROM public.business_focus
    WHERE (data->>'finished_year') ~ '^\d+$'
      AND (data->>'finished_year')::int < extract(year from ((now() AT TIME ZONE 'UTC') - interval '2 days'))::int$$
);
