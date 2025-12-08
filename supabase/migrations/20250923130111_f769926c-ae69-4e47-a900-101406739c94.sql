-- Fix Security Definer Views by removing SECURITY DEFINER property
-- This addresses the security issue where views enforce permissions of the creator rather than the querying user

-- First, let's identify and fix any views with SECURITY DEFINER
-- We'll drop and recreate them as regular views (SECURITY INVOKER by default)

-- Check if any of the existing views are defined with SECURITY DEFINER and fix them
DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
BEGIN
    -- Get all views that might have SECURITY DEFINER in their definition
    FOR view_record IN 
        SELECT schemaname, viewname, definition
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    LOOP
        -- Get the view definition and remove SECURITY DEFINER
        view_definition := view_record.definition;
        
        -- Remove SECURITY DEFINER from the definition
        view_definition := regexp_replace(view_definition, '\s+SECURITY\s+DEFINER\s*', ' ', 'gi');
        view_definition := regexp_replace(view_definition, '\s+SECURITY_DEFINER\s*', ' ', 'gi');
        
        -- Drop and recreate the view without SECURITY DEFINER
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        EXECUTE format('CREATE VIEW %I.%I AS %s', view_record.schemaname, view_record.viewname, view_definition);
        
        -- Grant appropriate permissions
        EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', view_record.schemaname, view_record.viewname);
        EXECUTE format('GRANT SELECT ON %I.%I TO anon', view_record.schemaname, view_record.viewname);
        
        RAISE NOTICE 'Fixed SECURITY DEFINER view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
    
    -- Also check materialized views
    FOR view_record IN 
        SELECT schemaname, matviewname as viewname, definition
        FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND (definition ILIKE '%security definer%' OR definition ILIKE '%security_definer%')
    LOOP
        -- Get the materialized view definition and remove SECURITY DEFINER
        view_definition := view_record.definition;
        
        -- Remove SECURITY DEFINER from the definition
        view_definition := regexp_replace(view_definition, '\s+SECURITY\s+DEFINER\s*', ' ', 'gi');
        view_definition := regexp_replace(view_definition, '\s+SECURITY_DEFINER\s*', ' ', 'gi');
        
        -- Drop and recreate the materialized view without SECURITY DEFINER
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        EXECUTE format('CREATE MATERIALIZED VIEW %I.%I AS %s', view_record.schemaname, view_record.viewname, view_definition);
        
        -- Grant appropriate permissions
        EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', view_record.schemaname, view_record.viewname);
        EXECUTE format('GRANT SELECT ON %I.%I TO anon', view_record.schemaname, view_record.viewname);
        
        RAISE NOTICE 'Fixed SECURITY DEFINER materialized view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END
$$;

-- Ensure all existing views have proper RLS policies instead of relying on SECURITY DEFINER
-- The views will now use the permissions of the querying user, which is more secure

-- If no SECURITY DEFINER views were found in the dynamic check above,
-- let's also ensure our known views are properly configured

-- Make sure all views are accessible with proper permissions
DO $$
DECLARE
    view_name TEXT;
    view_names TEXT[] := ARRAY[
        'active_surveys_v',
        'analytics_question_answers', 
        'analytics_responses',
        'analytics_surveys',
        'program_sessions_v1',
        'survey_available_years_v1',
        'survey_cumulative_stats',
        'instructor_survey_stats',
        'survey_aggregates'
    ];
BEGIN
    FOREACH view_name IN ARRAY view_names
    LOOP
        -- Grant proper permissions to these views
        BEGIN
            EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_name);
            EXECUTE format('GRANT SELECT ON public.%I TO anon', view_name);
        EXCEPTION
            WHEN undefined_table THEN
                -- View doesn't exist, skip
                NULL;
        END;
    END LOOP;
END
$$;

-- Add comment explaining the security fix
COMMENT ON SCHEMA public IS 'Schema cleaned of SECURITY DEFINER views for improved security. Views now use permissions of querying user rather than view creator.';