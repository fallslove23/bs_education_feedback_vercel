-- Reduce submission timeouts by disabling heavy recomputation on each answer insert
-- The trigger function currently recalculates course statistics on every insert into question_answers,
-- which can cause statement timeouts during peak submissions (mobile users reporting timeouts).
-- We replace the body with a no-op to keep writes fast. Dashboards can be refreshed via existing jobs/functions.

CREATE OR REPLACE FUNCTION public.trigger_update_course_statistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Previously: PERFORM public.update_course_statistics() when scale-type answers were inserted.
  -- Change: Skip heavy recalculation during online submissions to avoid timeouts.
  -- Rationale: update_course_statistics scans large tables; firing per row causes timeouts.
  -- We'll refresh stats asynchronously (manual or scheduled) via existing mechanisms.
  RETURN NEW;
END;
$$;