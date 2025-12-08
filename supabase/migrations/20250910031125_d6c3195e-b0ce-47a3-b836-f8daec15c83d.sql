-- Fix instructor matching in surveys_list_v2 by only exposing instructor_id when the linked profile actually has the 'instructor' role
-- and include program/session titles as before.

DROP VIEW IF EXISTS public.surveys_list_v2;

CREATE VIEW public.surveys_list_v2 AS
SELECT 
  s.id,
  s.title,
  s.status,
  s.course_name,
  s.education_year,
  s.education_round,
  s.education_day,
  s.expected_participants,
  s.course_id,
  s.template_id,
  s.start_date,
  s.end_date,
  s.created_at,
  s.updated_at,
  s.is_test,
  s.is_combined,
  s.combined_round_start,
  s.combined_round_end,
  s.round_label,
  s.description,
  s.created_by,
  -- Only keep instructor_id when the mapped user actually has the instructor role
  CASE 
    WHEN s.instructor_id IS NOT NULL AND EXISTS (
      SELECT 1 
      FROM public.user_roles ur 
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE p.instructor_id = s.instructor_id
        AND ur.role = 'instructor'
    ) THEN s.instructor_id
    ELSE NULL
  END AS instructor_id,
  s.program_id,
  s.session_id,
  prg.name AS program_title,
  sess.session_name AS session_title
FROM public.surveys s
LEFT JOIN public.programs prg ON prg.id = s.program_id
LEFT JOIN public.survey_sessions sess ON sess.id = s.session_id;