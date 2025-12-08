-- Create surveys_list_v1 view with exact field mapping
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
  COALESCE(p.email, 'unknown') as creator_email,
  COALESCE(i.name, 'Unknown') as instructor_name,
  COALESCE(c.title, 'Unknown') as course_title
FROM public.surveys s
LEFT JOIN public.profiles p ON p.id = s.created_by
LEFT JOIN public.instructors i ON i.id = s.instructor_id  
LEFT JOIN public.courses c ON c.id = s.course_id;

-- Create available years view
CREATE OR REPLACE VIEW public.survey_available_years_v1 AS
SELECT DISTINCT education_year
FROM public.surveys
WHERE education_year IS NOT NULL
ORDER BY education_year DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON public.surveys_list_v1 TO authenticated;
GRANT SELECT ON public.survey_available_years_v1 TO authenticated;