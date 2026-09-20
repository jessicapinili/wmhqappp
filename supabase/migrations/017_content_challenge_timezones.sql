-- =====================================================
-- 017 — Content Challenge: judge "today" by the member's timezone, not UTC
-- Replaces one function. No table, column or row is changed.
--
-- The future-date check compared log_date with CURRENT_DATE, which is the UTC date.
-- Members ahead of UTC (all of Australia, most of Europe) were refused when logging
-- their real today, e.g. Brisbane every morning before 10am AEST.
--
-- A day now counts as arrived once it has begun anywhere in the world: the check uses
-- the date in Pacific/Kiritimati (UTC+14, the first place each new day starts). Truly
-- future days are still refused, and the page separately stops members tapping days
-- that have not arrived on their own device clock.
-- =====================================================

CREATE OR REPLACE FUNCTION content_challenge_validate_log()
RETURNS TRIGGER AS $$
DECLARE
  round_start DATE;
BEGIN
  IF NEW.log_date > (now() AT TIME ZONE 'Pacific/Kiritimati')::date THEN
    RAISE EXCEPTION 'Cannot log posts for a day that has not arrived yet';
  END IF;

  -- Row level security applies to this lookup, so a round belonging to another
  -- member simply is not found and the write is refused.
  SELECT start_date INTO round_start
    FROM content_challenge_rounds WHERE id = NEW.round_id;

  IF round_start IS NULL THEN
    RAISE EXCEPTION 'Challenge round not found';
  END IF;

  IF NEW.log_date < round_start OR NEW.log_date > round_start + 29 THEN
    RAISE EXCEPTION 'That day falls outside the thirty day window';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
