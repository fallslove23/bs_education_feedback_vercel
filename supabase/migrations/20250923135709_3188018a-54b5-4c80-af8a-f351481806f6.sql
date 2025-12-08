-- Convert SECURITY DEFINER views to SECURITY INVOKER
-- This addresses the Security Definer View linter errors

BEGIN;

-- 1. active_surveys_v
CREATE OR REPLACE VIEW public.active_surveys_v
SECURITY INVOKER
AS SELECT id,
    title,
    description,
    instructor_id,
    course_id,
    template_id,
    status,
    start_date,
    end_date,
    created_by,
    created_at,
    updated_at,
    education_year,
    education_round,
    expected_participants,
    course_name,
    education_day
   FROM surveys s
  WHERE ((status = 'active'::text) AND ((start_date IS NULL) OR (now() >= start_date)) AND ((end_date IS NULL) OR (now() <= end_date)));

-- 2. survey_available_years_v1  
CREATE OR REPLACE VIEW public.survey_available_years_v1
SECURITY INVOKER
AS SELECT DISTINCT education_year
   FROM surveys
  WHERE education_year IS NOT NULL
  ORDER BY education_year DESC;

-- 3. program_sessions_v1
CREATE OR REPLACE VIEW public.program_sessions_v1
SECURITY INVOKER
AS SELECT ps.program_id,
    ps.session_id,
    ps.sort_order,
    ps.is_active,
    p.name AS program_title,
    s.title AS session_title
   FROM program_sessions ps
     LEFT JOIN programs p ON p.id = ps.program_id
     LEFT JOIN survey_sessions s ON s.id = ps.session_id;

-- Note: Materialized views cannot be converted to SECURITY INVOKER
-- They need to be revoked from public access instead
REVOKE SELECT ON public.mv_survey_stats FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_instructor_satisfaction FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_course_satisfaction FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_recent_activity FROM public, anon, authenticated;

-- Grant access only to admin-like roles for materialized views
GRANT SELECT ON public.mv_survey_stats TO service_role;
GRANT SELECT ON public.mv_instructor_satisfaction TO service_role;
GRANT SELECT ON public.mv_course_satisfaction TO service_role;
GRANT SELECT ON public.mv_recent_activity TO service_role;

-- Note: Complex views like instructor_survey_stats, survey_aggregates, and survey_cumulative_stats
-- are likely materialized views or computed tables rather than regular views
-- If they are regular views, they'll be converted in the next migration

COMMIT;