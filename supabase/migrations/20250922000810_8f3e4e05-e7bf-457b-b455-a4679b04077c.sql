-- Fix security issues found by linter

-- Fix function search paths for security (without IF EXISTS)
DO $$
BEGIN
  -- Fix search paths for existing functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_programs' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_updated_at_programs() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'propagate_is_test_to_response' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.propagate_is_test_to_response() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_update_course_statistics' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.trigger_update_course_statistics() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_role_change' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.log_role_change() SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_survey_code' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.generate_survey_code(integer) SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_short_code' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.generate_short_code(integer) SET search_path = public;
  END IF;
END$$;

-- Ensure user_roles table has proper RLS policies
DO $$
BEGIN
  -- Enable RLS on user_roles if not enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Add policy for users to view their own roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles" 
    ON public.user_roles 
    FOR SELECT 
    USING (user_id = auth.uid());
  END IF;

  -- Add policy for admins to manage all roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Admins can manage all roles'
  ) THEN
    CREATE POLICY "Admins can manage all roles" 
    ON public.user_roles 
    FOR ALL 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());
  END IF;
END$$;

-- Add missing RLS policies for key tables
DO $$
BEGIN
  -- Add missing policy for surveys table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'surveys' 
    AND policyname = 'Public can view active surveys'
  ) THEN
    CREATE POLICY "Public can view active surveys" 
    ON public.surveys 
    FOR SELECT 
    USING (status IN ('active', 'public') AND 
           (start_date IS NULL OR start_date <= now()) AND 
           (end_date IS NULL OR end_date >= now()));
  END IF;
END$$;