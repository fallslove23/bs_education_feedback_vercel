-- Generalize instructor_name resolution for all courses by updating the view
-- This avoids hardcoded course checks and removes any 'Unknown' placeholders from the source

CREATE OR REPLACE VIEW public.surveys_list_v1 AS
SELECT
  s.id,
  s.title,
  s.description,
  s.start_date,
  s.end_date,
  s.education_year,
  s.education_round,
  s.education_day,
  s.status,
  s.course_name,
  s.is_combined,
  s.combined_round_start,
  s.combined_round_end,
  s.round_label,
  s.template_id,
  s.expected_participants,
  s.is_test,
  s.created_by,
  s.instructor_id,
  s.course_id,
  s.created_at,
  s.updated_at,
  p.email AS creator_email,
  /* Prefer names from survey_instructors; fallback to surveys.instructor_id mapping; otherwise NULL */
  COALESCE(NULLIF(si_agg.names, ''), i.name) AS instructor_name,
  c.title AS course_title
FROM public.surveys s
LEFT JOIN public.profiles p ON p.id = s.created_by
LEFT JOIN public.courses c ON c.id = s.course_id
LEFT JOIN public.instructors i ON i.id = s.instructor_id
LEFT JOIN (
  SELECT si.survey_id, string_agg(DISTINCT i2.name, ', ') AS names
  FROM public.survey_instructors si
  JOIN public.instructors i2 ON i2.id = si.instructor_id
  GROUP BY si.survey_id
) si_agg ON si_agg.survey_id = s.id;