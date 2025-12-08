-- Drop and recreate surveys_list_v1 view with session_id and other missing columns
DROP VIEW IF EXISTS public.surveys_list_v1 CASCADE;

CREATE OR REPLACE VIEW public.surveys_list_v1 AS
SELECT 
  s.id,
  s.title,
  s.description,
  s.status,
  s.education_year,
  s.education_round,
  s.course_name,
  s.instructor_id,
  s.session_id,
  s.program_id,
  s.subject_id,
  s.is_test,
  s.is_grouped,
  s.group_type,
  s.group_number,
  i.name AS instructor_name,
  s.start_date,
  s.end_date,
  s.created_at,
  s.created_by,
  s.expected_participants,
  s.education_day,
  s.round_label,
  p.email as creator_email,
  prog.name as program_name,
  sess.title as session_title,
  subj.title as subject_title
FROM public.surveys s
LEFT JOIN public.instructors i ON i.id = s.instructor_id
LEFT JOIN public.profiles p ON p.id = s.created_by
LEFT JOIN public.programs prog ON prog.id = s.program_id
LEFT JOIN public.sessions sess ON sess.id = s.session_id
LEFT JOIN public.subjects subj ON subj.id = s.subject_id
ORDER BY s.education_year DESC, s.education_round DESC, s.created_at DESC;