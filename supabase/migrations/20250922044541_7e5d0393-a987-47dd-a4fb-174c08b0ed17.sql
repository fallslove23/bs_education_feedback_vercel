-- Fix get_survey_analysis numeric parsing and 5->10 scaling
CREATE OR REPLACE FUNCTION public.get_survey_analysis(survey_id_param uuid)
RETURNS TABLE(
  survey_info jsonb,
  response_count integer,
  satisfaction_scores jsonb,
  feedback_text jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  survey_info_data jsonb;
  response_count_data integer;
  satisfaction_scores_data jsonb;
  feedback_text_data jsonb;
BEGIN
  -- Basic survey info
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

  -- Response count
  SELECT COUNT(*)::integer INTO response_count_data
  FROM public.survey_responses sr
  WHERE sr.survey_id = survey_id_param;

  -- Satisfaction scores with safe numeric conversion and 5-scale normalization
  SELECT jsonb_build_object(
    'instructor_satisfaction', 
      AVG(
        CASE 
          WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating') THEN
            CASE 
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
              ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
            END
          ELSE NULL
        END
      ),
    'course_satisfaction', 
      AVG(
        CASE 
          WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating') THEN
            CASE 
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
              ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
            END
          ELSE NULL
        END
      ),
    'operation_satisfaction', 
      AVG(
        CASE 
          WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating') THEN
            CASE 
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
              WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
              ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
            END
          ELSE NULL
        END
      )
  ) INTO satisfaction_scores_data
  FROM public.survey_responses sr
  JOIN public.question_answers qa ON sr.id = qa.response_id
  JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE sr.survey_id = survey_id_param;

  -- Feedback text answers
  SELECT jsonb_agg(qa.answer_text) INTO feedback_text_data
  FROM public.survey_responses sr
  JOIN public.question_answers qa ON sr.id = qa.response_id
  JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE sr.survey_id = survey_id_param
    AND sq.question_type IN ('text','long_text','textarea','paragraph')
    AND qa.answer_text IS NOT NULL
    AND qa.answer_text != '';

  RETURN QUERY
  SELECT 
    COALESCE(survey_info_data, '{}'::jsonb),
    COALESCE(response_count_data, 0),
    COALESCE(satisfaction_scores_data, '{}'::jsonb),
    COALESCE(feedback_text_data, '[]'::jsonb);
END;
$function$;