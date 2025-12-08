-- Create missing functions for survey analysis and cumulative stats

-- Create get_survey_analysis function
CREATE OR REPLACE FUNCTION public.get_survey_analysis(
  survey_id_param uuid
)
RETURNS TABLE(
  survey_info jsonb,
  response_count integer,
  satisfaction_scores jsonb,
  feedback_text jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  survey_info_data jsonb;
  response_count_data integer;
  satisfaction_scores_data jsonb;
  feedback_text_data jsonb;
BEGIN
  -- Get survey basic information
  SELECT jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'status', s.status,
    'education_year', s.education_year,
    'education_round', s.education_round,
    'course_name', s.course_name,
    'instructor_name', i.name
  ) INTO survey_info_data
  FROM public.surveys s
  LEFT JOIN public.instructors i ON s.instructor_id = i.id
  WHERE s.id = survey_id_param;

  -- Get response count
  SELECT COUNT(*)::integer INTO response_count_data
  FROM public.survey_responses sr
  WHERE sr.survey_id = survey_id_param;

  -- Get satisfaction scores
  SELECT jsonb_build_object(
    'instructor_satisfaction', 
    AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' 
        THEN (qa.answer_value::text)::numeric END),
    'course_satisfaction',
    AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' 
        THEN (qa.answer_value::text)::numeric END),
    'operation_satisfaction',
    AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' 
        THEN (qa.answer_value::text)::numeric END)
  ) INTO satisfaction_scores_data
  FROM public.survey_responses sr
  JOIN public.question_answers qa ON sr.id = qa.response_id
  JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE sr.survey_id = survey_id_param;

  -- Get feedback text
  SELECT jsonb_agg(qa.answer_text) INTO feedback_text_data
  FROM public.survey_responses sr
  JOIN public.question_answers qa ON sr.id = qa.response_id
  JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE sr.survey_id = survey_id_param
    AND sq.question_type = 'text'
    AND qa.answer_text IS NOT NULL
    AND qa.answer_text != '';

  RETURN QUERY
  SELECT 
    COALESCE(survey_info_data, '{}'::jsonb),
    COALESCE(response_count_data, 0),
    COALESCE(satisfaction_scores_data, '{}'::jsonb),
    COALESCE(feedback_text_data, '[]'::jsonb);
END;
$$;

-- Create get_survey_cumulative_summary function
CREATE OR REPLACE FUNCTION public.get_survey_cumulative_summary()
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
AS $$
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
  WHERE s.status IN ('active', 'public', 'completed');
END;
$$;