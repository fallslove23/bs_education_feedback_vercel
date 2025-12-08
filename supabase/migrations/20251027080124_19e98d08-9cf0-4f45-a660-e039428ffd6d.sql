
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS rpc_course_filter_options(INTEGER);

-- Create updated course filter options RPC that uses session-based grouping
CREATE OR REPLACE FUNCTION rpc_course_filter_options(p_year INTEGER)
RETURNS TABLE (
  value TEXT,           -- session_id UUID as text
  label TEXT,           -- "YYYY년 N차 프로그램명"
  course_key TEXT,      -- same as label for compatibility  
  year INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ses.id::TEXT AS value,
    (ses.year::TEXT || '년 ' || ses.turn::TEXT || '차 ' || COALESCE(prog.name, ses.title, '과정 미정')) AS label,
    (ses.year::TEXT || '년 ' || ses.turn::TEXT || '차 ' || COALESCE(prog.name, ses.title, '과정 미정')) AS course_key,
    ses.year AS year
  FROM sessions ses
  LEFT JOIN programs prog ON ses.program_id = prog.id
  WHERE ses.year = p_year
    AND EXISTS (
      SELECT 1 FROM surveys s 
      WHERE s.session_id = ses.id 
        AND (s.is_test IS NULL OR s.is_test = false)
    )
  ORDER BY ses.year DESC, ses.turn DESC, label;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_course_filter_options(INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION rpc_course_filter_options IS 'Returns course filter options based on sessions (not individual survey course_name) to avoid mixing subjects with courses';
