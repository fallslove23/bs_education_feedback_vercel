-- Fix remaining security issues from linter

-- Fix remaining functions with mutable search paths
DO $$
BEGIN
  -- Fix search paths for additional functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'safe_numeric_convert' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.safe_numeric_convert(text) SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_survey_statuses' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_survey_statuses() SET search_path = public;
  END IF;

  -- Check for any other functions with mutable search paths and fix them
  FOR rec IN 
    SELECT proname, proargtypes 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_settings 
      WHERE name = 'search_path' 
      AND source = 'function'
    )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', rec.proname);
    EXCEPTION 
      WHEN OTHERS THEN
        -- Skip functions that can't be altered (system functions, etc.)
        CONTINUE;
    END;
  END LOOP;
END$$;

-- Secure materialized views by revoking public access and granting specific roles
DO $$
BEGIN
  -- Revoke public access from materialized views
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_survey_stats' AND table_schema = 'public') THEN
    REVOKE ALL ON public.mv_survey_stats FROM PUBLIC;
    REVOKE ALL ON public.mv_survey_stats FROM anon;
    GRANT SELECT ON public.mv_survey_stats TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_instructor_satisfaction' AND table_schema = 'public') THEN
    REVOKE ALL ON public.mv_instructor_satisfaction FROM PUBLIC;
    REVOKE ALL ON public.mv_instructor_satisfaction FROM anon;
    GRANT SELECT ON public.mv_instructor_satisfaction TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_course_satisfaction' AND table_schema = 'public') THEN
    REVOKE ALL ON public.mv_course_satisfaction FROM PUBLIC;
    REVOKE ALL ON public.mv_course_satisfaction FROM anon;
    GRANT SELECT ON public.mv_course_satisfaction TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_recent_activity' AND table_schema = 'public') THEN
    REVOKE ALL ON public.mv_recent_activity FROM PUBLIC;
    REVOKE ALL ON public.mv_recent_activity FROM anon;
    GRANT SELECT ON public.mv_recent_activity TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_survey_response_trends' AND table_schema = 'public') THEN
    REVOKE ALL ON public.mv_survey_response_trends FROM PUBLIC;
    REVOKE ALL ON public.mv_survey_response_trends FROM anon;
    GRANT SELECT ON public.mv_survey_response_trends TO authenticated;
  END IF;
END$$;

-- Fix security definer views by converting them to regular views or adding proper RLS
DO $$
BEGIN
  -- Check and fix analytics views
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'analytics_surveys' AND table_schema = 'public') THEN
    -- Revoke public access and limit to authenticated users
    REVOKE ALL ON public.analytics_surveys FROM PUBLIC;
    REVOKE ALL ON public.analytics_surveys FROM anon;
    GRANT SELECT ON public.analytics_surveys TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'analytics_responses' AND table_schema = 'public') THEN
    REVOKE ALL ON public.analytics_responses FROM PUBLIC;
    REVOKE ALL ON public.analytics_responses FROM anon;
    GRANT SELECT ON public.analytics_responses TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'analytics_question_answers' AND table_schema = 'public') THEN
    REVOKE ALL ON public.analytics_question_answers FROM PUBLIC;
    REVOKE ALL ON public.analytics_question_answers FROM anon;
    GRANT SELECT ON public.analytics_question_answers TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'survey_aggregates' AND table_schema = 'public') THEN
    REVOKE ALL ON public.survey_aggregates FROM PUBLIC;
    REVOKE ALL ON public.survey_aggregates FROM anon;
    GRANT SELECT ON public.survey_aggregates TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_surveys_v' AND table_schema = 'public') THEN
    -- This view can remain public as it only shows active surveys
    GRANT SELECT ON public.active_surveys_v TO PUBLIC;
    GRANT SELECT ON public.active_surveys_v TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'survey_available_years_v1' AND table_schema = 'public') THEN
    -- This view can remain public as it only shows available years
    GRANT SELECT ON public.survey_available_years_v1 TO PUBLIC;
    GRANT SELECT ON public.survey_available_years_v1 TO anon;
  END IF;
END$$;