-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_course_filter_options;

-- Create view for course filter options based on sessions
CREATE OR REPLACE VIEW public.v_course_filter_options AS
SELECT
  s.id AS session_id,
  s.title AS session_title,
  COALESCE(s.course_name, c.title) AS course_title,
  EXTRACT(YEAR FROM MIN(v.submitted_at))::int AS year,
  COUNT(DISTINCT v.response_id) AS response_count
FROM public.v_survey_responses_canonical v
JOIN public.surveys s ON s.id = v.session_id
LEFT JOIN public.courses c ON c.id = COALESCE(s.course_id, v.course_id::uuid)
GROUP BY s.id, s.title, COALESCE(s.course_name, c.title);

-- Grant access to authenticated users
GRANT SELECT ON public.v_course_filter_options TO authenticated;
GRANT SELECT ON public.v_course_filter_options TO anon;