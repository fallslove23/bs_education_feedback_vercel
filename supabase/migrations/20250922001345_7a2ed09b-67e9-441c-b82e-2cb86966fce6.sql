-- Fix remaining security definer functions and final security issues

-- Fix search_path for remaining security definer functions
DO $$
BEGIN
  -- Fix functions that still don't have proper search_path
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_admin_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.create_admin_user(text, text) SET search_path = public;
  END IF;
END$$;

-- Check for and fix any views that might be causing security definer issues
-- Sometimes the linter reports views when it means functions or materialized views
DO $$
DECLARE
  view_name TEXT;
BEGIN
  -- List all views and check if any need to be converted or secured
  FOR view_name IN 
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
  LOOP
    BEGIN
      -- Ensure all views have appropriate permissions
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', view_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', view_name);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_name);
      
      -- Allow specific views to remain public if they contain only non-sensitive data
      IF view_name IN ('active_surveys_v', 'survey_available_years_v1', 'program_sessions_v1') THEN
        EXECUTE format('GRANT SELECT ON public.%I TO PUBLIC', view_name);
        EXECUTE format('GRANT SELECT ON public.%I TO anon', view_name);
      END IF;
    EXCEPTION 
      WHEN OTHERS THEN
        -- Skip any views that can't be altered
        CONTINUE;
    END;
  END LOOP;
END$$;

-- Ensure proper RLS is enabled on all relevant tables
DO $$
BEGIN
  -- Make sure all tables that should have RLS enabled actually do
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_tokens' AND table_schema = 'public') THEN
    ALTER TABLE public.survey_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainees' AND table_schema = 'public') THEN
    ALTER TABLE public.trainees ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_questions' AND table_schema = 'public') THEN
    ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_sections' AND table_schema = 'public') THEN
    ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_filter_presets' AND table_schema = 'public') THEN
    ALTER TABLE public.user_filter_presets ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

-- Final cleanup: revoke unnecessary permissions from public schemas
DO $$
BEGIN
  -- Remove default permissions that might be too permissive
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  
  -- Ensure anon and authenticated roles have appropriate base permissions
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT USAGE ON SCHEMA public TO authenticated;
END$$;