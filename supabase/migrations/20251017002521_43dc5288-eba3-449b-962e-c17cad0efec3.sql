-- Create RPC function to get session-based course filter options
CREATE OR REPLACE FUNCTION public.fn_session_filter_options(
  p_year integer DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  session_id uuid,
  session_title text,
  course_title text,
  year integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT
    ss.id as session_id,
    ss.session_name as session_title,
    c.title as course_title,
    s.education_year as year
  FROM public.survey_sessions ss
  INNER JOIN public.surveys s ON ss.survey_id = s.id
  LEFT JOIN public.courses c ON ss.course_id = c.id
  WHERE (p_year IS NULL OR s.education_year = p_year)
    AND (p_search IS NULL OR ss.session_name ILIKE '%' || p_search || '%')
  ORDER BY ss.session_name ASC, s.education_year DESC;
$$;