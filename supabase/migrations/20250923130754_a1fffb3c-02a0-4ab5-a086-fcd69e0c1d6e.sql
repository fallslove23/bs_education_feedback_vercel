-- Fix linter ERROR: Security Definer View
-- Convert read-only, view-like RPC functions to SECURITY INVOKER
-- and ensure required SELECT privileges exist on underlying relations.

begin;

-- 1) Switch selected RPCs to SECURITY INVOKER (no privilege escalation)
ALTER FUNCTION public.course_report_statistics(integer, text, integer, uuid, boolean)
  SECURITY INVOKER;

ALTER FUNCTION public.get_course_statistics(integer, text, integer, uuid, boolean)
  SECURITY INVOKER;

ALTER FUNCTION public.get_survey_responses_by_date_range(date, date)
  SECURITY INVOKER;

ALTER FUNCTION public.get_instructor_stats_optimized(uuid, integer)
  SECURITY INVOKER;

ALTER FUNCTION public.get_survey_cumulative_summary()
  SECURITY INVOKER;

ALTER FUNCTION public.get_survey_analysis(uuid)
  SECURITY INVOKER;

ALTER FUNCTION public.get_session_statistics(uuid, uuid)
  SECURITY INVOKER;

ALTER FUNCTION public.get_survey_detail_stats(uuid, boolean, integer, integer, integer, integer, integer, integer)
  SECURITY INVOKER;

-- 2) Grant minimal SELECT privileges needed for invoker to run
-- survey_aggregates is the primary source for course_report_statistics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_privileges 
    WHERE grantee = 'authenticated' AND table_schema='public' AND table_name='survey_aggregates' AND privilege_type='SELECT'
  ) THEN
    EXECUTE 'GRANT SELECT ON TABLE public.survey_aggregates TO authenticated';
  END IF;
END $$;

commit;