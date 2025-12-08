-- Final attempt to resolve Security Definer View issues
-- These might be functions exposed as views through PostgREST API

-- Hide security definer functions from API by revoking execute permissions from anon/public
DO $$
DECLARE
  func_name TEXT;
  func_signature TEXT;
BEGIN
  -- Revoke EXECUTE permissions on security definer functions from public roles
  -- This prevents them from being accessible via the API as "views"
  
  FOR func_name, func_signature IN 
    SELECT 
      p.proname,
      p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.prosecdef = true
      AND p.proname NOT IN (
        'is_admin', 'is_operator', 'is_instructor', 'is_director', 'has_role', 
        'get_current_user_role', 'get_user_roles'
      )
  LOOP
    BEGIN
      -- Revoke execute from anon and public for non-essential security definer functions
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', func_signature);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', func_signature);
      
      -- Grant execute only to authenticated users for most functions
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', func_signature);
      
    EXCEPTION 
      WHEN OTHERS THEN
        -- Skip functions that can't be altered
        CONTINUE;
    END;
  END LOOP;
END$$;

-- Ensure essential role checking functions remain accessible
DO $$
BEGIN
  -- Keep essential functions accessible to authenticated users
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.is_instructor() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
  
  -- Allow anon access to basic role checking for public surveys
  GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO anon;
EXCEPTION 
  WHEN OTHERS THEN
    -- Continue if functions don't exist
    NULL;
END$$;

-- Final security cleanup - ensure all materialized views are properly secured
DO $$
DECLARE
  mv_name TEXT;
BEGIN
  -- Find and secure all materialized views
  FOR mv_name IN 
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND c.relkind = 'm'
  LOOP
    BEGIN
      -- Revoke all access to materialized views from public and anon
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', mv_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', mv_name);
      
      -- Grant access only to authenticated users
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', mv_name);
      
    EXCEPTION 
      WHEN OTHERS THEN
        -- Skip if can't alter
        CONTINUE;
    END;
  END LOOP;
END$$;