-- Fix rpc_course_filter_options to only show sessions with program_id (exclude subject-based sessions)
CREATE OR REPLACE FUNCTION rpc_course_filter_options(p_year INT)
RETURNS TABLE(
  value TEXT,
  label TEXT,
  course_key TEXT,
  year INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT AS value,
    (s.year || '년 ' || s.turn || '차 ' || COALESCE(p.name, s.title)) AS label,
    COALESCE(p.name, s.title) AS course_key,
    s.year AS year
  FROM sessions s
  LEFT JOIN programs p ON p.id = s.program_id
  WHERE s.year = p_year
    AND s.program_id IS NOT NULL  -- Only include sessions with a valid program
  ORDER BY s.turn ASC, label ASC;
END;
$$;