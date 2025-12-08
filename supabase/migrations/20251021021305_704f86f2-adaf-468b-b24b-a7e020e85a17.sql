-- Create v_session_course_canonical view for session-to-course mapping
-- This view provides a canonical reference for sessions with course information
CREATE OR REPLACE VIEW public.v_session_course_canonical AS
SELECT DISTINCT
  s.id AS session_id,
  s.year AS education_year,
  s.turn AS education_round,
  s.title AS session_title,
  s.program_id,
  p.name AS program_name,
  s.created_at
FROM public.sessions s
LEFT JOIN public.programs p ON p.id = s.program_id
WHERE s.id IS NOT NULL;

-- Grant access to authenticated users
GRANT SELECT ON public.v_session_course_canonical TO authenticated;
GRANT SELECT ON public.v_session_course_canonical TO anon;