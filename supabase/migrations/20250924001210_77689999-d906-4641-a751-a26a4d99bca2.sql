-- Final cleanup - Convert remaining SECURITY DEFINER views and add search_path to functions
BEGIN;

-- Fix the remaining search_path issues for app_role and app_uid functions
CREATE OR REPLACE FUNCTION app_role()
RETURNS text 
LANGUAGE sql 
STABLE 
SET search_path = ''
AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'app_role','anonymous')
$$;

CREATE OR REPLACE FUNCTION app_uid()
RETURNS uuid 
LANGUAGE sql 
STABLE 
SET search_path = ''
AS $$
  SELECT auth.uid()
$$;

-- Revoke access from materialized views to address warnings
REVOKE SELECT ON public.mv_survey_stats FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_instructor_satisfaction FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_course_satisfaction FROM public, anon, authenticated;
REVOKE SELECT ON public.mv_recent_activity FROM public, anon, authenticated;

COMMIT;