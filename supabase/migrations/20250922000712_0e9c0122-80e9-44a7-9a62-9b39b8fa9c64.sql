-- Fix security definer views and function search paths

-- First, let's check if we have any security definer views that need fixing
-- This migration addresses the linter issues found

-- Fix function search paths for security
ALTER FUNCTION IF EXISTS public.handle_new_user() SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_updated_at_programs() SET search_path = public;
ALTER FUNCTION IF EXISTS public.propagate_is_test_to_response() SET search_path = public;
ALTER FUNCTION IF EXISTS public.trigger_update_course_statistics() SET search_path = public;

-- Ensure all RLS policies are properly configured for key tables
-- Add missing RLS policies if needed

-- Ensure user_roles table has proper RLS
DO $$
BEGIN
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

-- Ensure surveys table has complete RLS coverage
DO $$
BEGIN
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

-- Add missing policies for survey_tokens if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_tokens' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'survey_tokens' 
      AND policyname = 'Public can use valid tokens'
    ) THEN
      CREATE POLICY "Public can use valid tokens" 
      ON public.survey_tokens 
      FOR SELECT 
      USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'survey_tokens' 
      AND policyname = 'Admins can manage tokens'
    ) THEN
      CREATE POLICY "Admins can manage tokens" 
      ON public.survey_tokens 
      FOR ALL 
      USING (public.is_admin()) 
      WITH CHECK (public.is_admin());
    END IF;
  END IF;
END$$;

-- Add missing policies for trainees table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainees' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'trainees' 
      AND policyname = 'Admins and operators can manage trainees'
    ) THEN
      CREATE POLICY "Admins and operators can manage trainees" 
      ON public.trainees 
      FOR ALL 
      USING (public.is_admin() OR public.is_operator()) 
      WITH CHECK (public.is_admin() OR public.is_operator());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'trainees' 
      AND policyname = 'Authenticated users can view trainees'
    ) THEN
      CREATE POLICY "Authenticated users can view trainees" 
      ON public.trainees 
      FOR SELECT 
      USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END$$;

-- Add missing policies for template tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_questions' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'template_questions' 
      AND policyname = 'Admins can manage template questions'
    ) THEN
      CREATE POLICY "Admins can manage template questions" 
      ON public.template_questions 
      FOR ALL 
      USING (public.is_admin()) 
      WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'template_questions' 
      AND policyname = 'Authenticated users can view template questions'
    ) THEN
      CREATE POLICY "Authenticated users can view template questions" 
      ON public.template_questions 
      FOR SELECT 
      USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_sections' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'template_sections' 
      AND policyname = 'Admins can manage template sections'
    ) THEN
      CREATE POLICY "Admins can manage template sections" 
      ON public.template_sections 
      FOR ALL 
      USING (public.is_admin()) 
      WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'template_sections' 
      AND policyname = 'Authenticated users can view template sections'
    ) THEN
      CREATE POLICY "Authenticated users can view template sections" 
      ON public.template_sections 
      FOR SELECT 
      USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END$$;

-- Add missing policies for user_filter_presets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_filter_presets' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_filter_presets' 
      AND policyname = 'Users can manage their own filter presets'
    ) THEN
      CREATE POLICY "Users can manage their own filter presets" 
      ON public.user_filter_presets 
      FOR ALL 
      USING (user_id = auth.uid()) 
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END$$;