-- Create function to get RLS policies information
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE(
  table_name text,
  policy_name text,
  command text,
  roles text,
  using_expression text,
  with_check text,
  is_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    pol.tablename::text as table_name,
    pol.policyname::text as policy_name,
    pol.cmd::text as command,
    COALESCE(pol.roles::text, 'All roles') as roles,
    COALESCE(pol.qual, 'No condition')::text as using_expression,
    COALESCE(pol.with_check, 'No check')::text as with_check,
    CASE 
      WHEN pol.permissive = 'PERMISSIVE' THEN true 
      ELSE false 
    END as is_enabled
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
  ORDER BY pol.tablename, pol.policyname;
$$;