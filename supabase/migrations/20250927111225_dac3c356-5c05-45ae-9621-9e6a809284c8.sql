-- Enable RLS for tables that have policies but RLS disabled
-- Check which tables need RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename IN (
  SELECT DISTINCT tablename 
  FROM pg_policies 
  WHERE schemaname = 'public'
);

-- Enable RLS for tables that have policies but RLS is disabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Check for other tables without RLS in public schema
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename NOT IN ('course_name_to_session_map', 'course_names', 'programs', 'program_sessions', 'program_sessions_v1')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', table_record.schemaname, table_record.tablename);
        RAISE NOTICE 'Enabled RLS for table: %.%', table_record.schemaname, table_record.tablename;
    END LOOP;
END $$;