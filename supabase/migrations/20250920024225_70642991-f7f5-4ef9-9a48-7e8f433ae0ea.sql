-- Create course_report_statistics function
CREATE OR REPLACE FUNCTION public.course_report_statistics(
  p_year integer,
  p_course_name text DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE(
  summary jsonb,
  trend jsonb,
  instructor_stats jsonb,
  textual_responses jsonb,
  available_courses jsonb,
  available_instructors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  summary_data jsonb;
  trend_data jsonb;
  instructor_stats_data jsonb;
  textual_responses_data jsonb;
  available_courses_data jsonb;
  available_instructors_data jsonb;
BEGIN
  -- Build summary data
  SELECT jsonb_build_object(
    'educationYear', p_year,
    'courseName', p_course_name,
    'normalizedCourseName', p_course_name,
    'educationRound', p_round,
    'instructorId', p_instructor_id,
    'availableRounds', COALESCE(summary_rounds.rounds, '[]'::jsonb),
    'totalSurveys', COALESCE(summary_counts.total_surveys, 0),
    'totalResponses', COALESCE(summary_counts.total_responses, 0),
    'avgInstructorSatisfaction', summary_counts.avg_instructor_satisfaction,
    'avgCourseSatisfaction', summary_counts.avg_course_satisfaction,
    'avgOperationSatisfaction', summary_counts.avg_operation_satisfaction,
    'instructorCount', COALESCE(summary_counts.instructor_count, 0)
  ) INTO summary_data
  FROM (
    SELECT 
      COUNT(DISTINCT s.id) as total_surveys,
      COUNT(DISTINCT sr.id) as total_responses,
      COUNT(DISTINCT s.instructor_id) as instructor_count,
      AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_instructor_satisfaction,
      AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_course_satisfaction,
      AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_operation_satisfaction
    FROM public.surveys s
    LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE s.education_year = p_year
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
  ) summary_counts
  LEFT JOIN (
    SELECT jsonb_agg(DISTINCT s.education_round ORDER BY s.education_round) as rounds
    FROM public.surveys s
    WHERE s.education_year = p_year
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
  ) summary_rounds ON true;

  -- Build trend data
  SELECT jsonb_agg(
    jsonb_build_object(
      'educationRound', trend_round,
      'avgInstructorSatisfaction', avg_instructor_satisfaction,
      'avgCourseSatisfaction', avg_course_satisfaction,
      'avgOperationSatisfaction', avg_operation_satisfaction,
      'responseCount', response_count
    ) ORDER BY trend_round
  ) INTO trend_data
  FROM (
    SELECT 
      s.education_round as trend_round,
      COUNT(sr.id) as response_count,
      AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_instructor_satisfaction,
      AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_course_satisfaction,
      AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_operation_satisfaction
    FROM public.surveys s
    LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE s.education_year = p_year
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
    GROUP BY s.education_round
  ) trend_query;

  -- Build instructor stats
  SELECT jsonb_agg(
    jsonb_build_object(
      'instructorId', instructor_id,
      'instructorName', instructor_name,
      'surveyCount', survey_count,
      'responseCount', response_count,
      'avgSatisfaction', avg_satisfaction
    )
  ) INTO instructor_stats_data
  FROM (
    SELECT 
      s.instructor_id,
      COALESCE(i.name, 'Unknown') as instructor_name,
      COUNT(DISTINCT s.id) as survey_count,
      COUNT(sr.id) as response_count,
      AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' 
          THEN (qa.answer_value::text)::numeric END) as avg_satisfaction
    FROM public.surveys s
    LEFT JOIN public.instructors i ON s.instructor_id = i.id
    LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE s.education_year = p_year
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
      AND s.instructor_id IS NOT NULL
    GROUP BY s.instructor_id, i.name
  ) instructor_query;

  -- Build textual responses
  SELECT jsonb_agg(qa.answer_text) INTO textual_responses_data
  FROM public.surveys s
  JOIN public.survey_responses sr ON s.id = sr.survey_id
  JOIN public.question_answers qa ON sr.id = qa.response_id
  JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE s.education_year = p_year
    AND (p_course_name IS NULL OR s.course_name = p_course_name)
    AND (p_round IS NULL OR s.education_round = p_round)
    AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
    AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
    AND sq.question_type = 'text'
    AND qa.answer_text IS NOT NULL
    AND qa.answer_text != '';

  -- Build available courses
  SELECT jsonb_agg(
    jsonb_build_object(
      'normalizedName', course_name,
      'displayName', course_name,
      'rounds', rounds
    )
  ) INTO available_courses_data
  FROM (
    SELECT 
      s.course_name,
      jsonb_agg(DISTINCT s.education_round ORDER BY s.education_round) as rounds
    FROM public.surveys s
    WHERE s.education_year = p_year
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
      AND s.course_name IS NOT NULL
    GROUP BY s.course_name
  ) courses_query;

  -- Build available instructors
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', instructor_id,
      'name', instructor_name
    )
  ) INTO available_instructors_data
  FROM (
    SELECT DISTINCT
      s.instructor_id,
      COALESCE(i.name, 'Unknown') as instructor_name
    FROM public.surveys s
    LEFT JOIN public.instructors i ON s.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test = true OR COALESCE(s.is_test, false) = false)
      AND s.instructor_id IS NOT NULL
  ) instructors_query;

  -- Return the results
  RETURN QUERY
  SELECT 
    COALESCE(summary_data, '{}'::jsonb),
    COALESCE(trend_data, '[]'::jsonb),
    COALESCE(instructor_stats_data, '[]'::jsonb),
    COALESCE(textual_responses_data, '[]'::jsonb),
    COALESCE(available_courses_data, '[]'::jsonb),
    COALESCE(available_instructors_data, '[]'::jsonb);
END;
$$;

-- Create get_course_statistics function (alias for course_report_statistics)
CREATE OR REPLACE FUNCTION public.get_course_statistics(
  p_year integer,
  p_course_name text DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE(
  summary jsonb,
  trend jsonb,
  instructor_stats jsonb,
  textual_responses jsonb,
  available_courses jsonb,
  available_instructors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This is an alias function that calls course_report_statistics
  RETURN QUERY
  SELECT * FROM public.course_report_statistics(
    p_year, p_course_name, p_round, p_instructor_id, p_include_test
  );
END;
$$;