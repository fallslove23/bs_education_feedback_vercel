-- Fix remaining security issues (simplified approach)

-- Fix search paths for specific remaining functions
DO $$
BEGIN
  -- Fix search paths for additional functions one by one
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'safe_numeric_convert' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.safe_numeric_convert(text) SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_survey_statuses' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_survey_statuses() SET search_path = public;
  END IF;
END$$;

-- Secure materialized views by limiting access
DO $$
BEGIN
  -- Secure materialized views if they exist
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'mv_survey_stats' AND c.relkind = 'm') THEN
    REVOKE ALL ON public.mv_survey_stats FROM PUBLIC;
    REVOKE ALL ON public.mv_survey_stats FROM anon;
    GRANT SELECT ON public.mv_survey_stats TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'mv_instructor_satisfaction' AND c.relkind = 'm') THEN
    REVOKE ALL ON public.mv_instructor_satisfaction FROM PUBLIC;
    REVOKE ALL ON public.mv_instructor_satisfaction FROM anon;
    GRANT SELECT ON public.mv_instructor_satisfaction TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'mv_course_satisfaction' AND c.relkind = 'm') THEN
    REVOKE ALL ON public.mv_course_satisfaction FROM PUBLIC;
    REVOKE ALL ON public.mv_course_satisfaction FROM anon;
    GRANT SELECT ON public.mv_course_satisfaction TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'mv_recent_activity' AND c.relkind = 'm') THEN
    REVOKE ALL ON public.mv_recent_activity FROM PUBLIC;
    REVOKE ALL ON public.mv_recent_activity FROM anon;
    GRANT SELECT ON public.mv_recent_activity TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'mv_survey_response_trends' AND c.relkind = 'm') THEN
    REVOKE ALL ON public.mv_survey_response_trends FROM PUBLIC;
    REVOKE ALL ON public.mv_survey_response_trends FROM anon;
    GRANT SELECT ON public.mv_survey_response_trends TO authenticated;
  END IF;
END$$;

-- Secure analytics views
DO $$
BEGIN
  -- Limit access to analytics views to authenticated users only
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'analytics_surveys' AND c.relkind = 'v') THEN
    REVOKE ALL ON public.analytics_surveys FROM PUBLIC;
    REVOKE ALL ON public.analytics_surveys FROM anon;
    GRANT SELECT ON public.analytics_surveys TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'analytics_responses' AND c.relkind = 'v') THEN
    REVOKE ALL ON public.analytics_responses FROM PUBLIC;
    REVOKE ALL ON public.analytics_responses FROM anon;
    GRANT SELECT ON public.analytics_responses TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'analytics_question_answers' AND c.relkind = 'v') THEN
    REVOKE ALL ON public.analytics_question_answers FROM PUBLIC;
    REVOKE ALL ON public.analytics_question_answers FROM anon;
    GRANT SELECT ON public.analytics_question_answers TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
             WHERE n.nspname = 'public' AND c.relname = 'survey_aggregates' AND c.relkind = 'v') THEN
    REVOKE ALL ON public.survey_aggregates FROM PUBLIC;
    REVOKE ALL ON public.survey_aggregates FROM anon;
    GRANT SELECT ON public.survey_aggregates TO authenticated;
  END IF;
END$$;