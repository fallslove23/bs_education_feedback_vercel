-- Create the get_survey_cumulative_summary function with proper parameters
CREATE OR REPLACE FUNCTION public.get_survey_cumulative_summary(
  search_term text DEFAULT NULL,
  education_year integer DEFAULT NULL,
  course_name text DEFAULT NULL,
  include_test_data boolean DEFAULT false
)
RETURNS TABLE(
  total_surveys integer,
  total_responses integer,
  average_satisfaction numeric,
  participating_instructors integer,
  courses_in_progress integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT s.id)::integer as total_surveys,
    COUNT(DISTINCT sr.id)::integer as total_responses,
    AVG(CASE WHEN sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type = 'scale' 
        THEN (qa.answer_value::text)::numeric END) as average_satisfaction,
    COUNT(DISTINCT s.instructor_id)::integer as participating_instructors,
    COUNT(DISTINCT s.course_name)::integer as courses_in_progress
  FROM public.surveys s
  LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
  LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
  LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE 
    s.status IN ('active', 'public', 'completed')
    AND (include_test_data = true OR COALESCE(s.is_test, false) = false)
    AND (education_year IS NULL OR s.education_year = education_year)
    AND (course_name IS NULL OR s.course_name = course_name)
    AND (search_term IS NULL OR search_term = '' OR (
      s.title ILIKE '%' || search_term || '%' OR
      s.course_name ILIKE '%' || search_term || '%' OR
      EXISTS (
        SELECT 1 FROM public.instructors i 
        WHERE i.id = s.instructor_id AND i.name ILIKE '%' || search_term || '%'
      )
    ));
END;
$function$;