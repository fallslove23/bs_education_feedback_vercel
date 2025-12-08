-- Create a working course report function that calculates data from base tables
CREATE OR REPLACE FUNCTION public.get_course_reports_working(
  p_year integer,
  p_course_name text DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  WITH survey_base AS (
    SELECT DISTINCT
      s.id as survey_id,
      s.education_year,
      s.education_round,
      s.course_name,
      s.instructor_id,
      i.name as instructor_name,
      s.is_test
    FROM public.surveys s
    LEFT JOIN public.instructors i ON s.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_course_name IS NULL OR s.course_name = p_course_name)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false)
  ),
  response_stats AS (
    SELECT 
      sb.survey_id,
      sb.education_year,
      sb.education_round,
      sb.course_name,
      sb.instructor_id,
      sb.instructor_name,
      COUNT(sr.id) as response_count,
      AVG(CASE 
        WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating')
          AND qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (qa.answer_value::text)::numeric
        ELSE NULL
      END) as avg_instructor_satisfaction,
      AVG(CASE 
        WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating')
          AND qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (qa.answer_value::text)::numeric
        ELSE NULL
      END) as avg_course_satisfaction,
      AVG(CASE 
        WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating')
          AND qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (qa.answer_value::text)::numeric
        ELSE NULL
      END) as avg_operation_satisfaction
    FROM survey_base sb
    LEFT JOIN public.survey_responses sr ON sb.survey_id = sr.survey_id
      AND (p_include_test IS TRUE OR COALESCE(sr.is_test, false) = false)
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    GROUP BY sb.survey_id, sb.education_year, sb.education_round, sb.course_name, sb.instructor_id, sb.instructor_name
  ),
  summary_calc AS (
    SELECT
      COUNT(*) as total_surveys,
      COALESCE(SUM(response_count), 0) as total_responses,
      COUNT(DISTINCT instructor_id) FILTER (WHERE instructor_id IS NOT NULL) as instructor_count,
      CASE WHEN SUM(response_count) > 0 THEN 
        ROUND(SUM(avg_instructor_satisfaction * response_count) / SUM(response_count), 2) 
      ELSE NULL END as weighted_instructor_satisfaction,
      CASE WHEN SUM(response_count) > 0 THEN 
        ROUND(SUM(avg_course_satisfaction * response_count) / SUM(response_count), 2) 
      ELSE NULL END as weighted_course_satisfaction,
      CASE WHEN SUM(response_count) > 0 THEN 
        ROUND(SUM(avg_operation_satisfaction * response_count) / SUM(response_count), 2) 
      ELSE NULL END as weighted_operation_satisfaction
    FROM response_stats
    WHERE avg_instructor_satisfaction IS NOT NULL 
       OR avg_course_satisfaction IS NOT NULL 
       OR avg_operation_satisfaction IS NOT NULL
  )
  SELECT json_build_object(
    'summary', json_build_object(
      'educationYear', p_year,
      'courseName', p_course_name,
      'normalizedCourseName', p_course_name,
      'educationRound', p_round,
      'instructorId', p_instructor_id,
      'availableRounds', COALESCE((
        SELECT json_agg(DISTINCT education_round ORDER BY education_round)
        FROM response_stats
      ), '[]'::json),
      'totalSurveys', sc.total_surveys,
      'totalResponses', sc.total_responses,
      'avgInstructorSatisfaction', sc.weighted_instructor_satisfaction,
      'avgCourseSatisfaction', sc.weighted_course_satisfaction,
      'avgOperationSatisfaction', sc.weighted_operation_satisfaction,
      'instructorCount', sc.instructor_count
    ),
    'trend', COALESCE((
      SELECT json_agg(
        json_build_object(
          'educationRound', education_round,
          'avgInstructorSatisfaction', ROUND(AVG(avg_instructor_satisfaction), 2),
          'avgCourseSatisfaction', ROUND(AVG(avg_course_satisfaction), 2),
          'avgOperationSatisfaction', ROUND(AVG(avg_operation_satisfaction), 2),
          'responseCount', SUM(response_count)
        ) ORDER BY education_round
      )
      FROM response_stats
      GROUP BY education_round
    ), '[]'::json),
    'instructor_stats', COALESCE((
      SELECT json_agg(
        json_build_object(
          'instructorId', instructor_id,
          'instructorName', instructor_name,
          'surveyCount', COUNT(*),
          'responseCount', SUM(response_count),
          'avgSatisfaction', ROUND(AVG(COALESCE(avg_instructor_satisfaction, avg_course_satisfaction, avg_operation_satisfaction)), 2)
        ) ORDER BY instructor_name NULLS LAST
      )
      FROM response_stats
      WHERE instructor_id IS NOT NULL
      GROUP BY instructor_id, instructor_name
    ), '[]'::json),
    'textual_responses', '[]'::json,
    'available_courses', COALESCE((
      SELECT json_agg(
        json_build_object(
          'normalizedName', course_name,
          'displayName', course_name,
          'rounds', rounds
        ) ORDER BY course_name
      )
      FROM (
        SELECT 
          course_name,
          json_agg(DISTINCT education_round ORDER BY education_round) as rounds
        FROM response_stats
        WHERE course_name IS NOT NULL
        GROUP BY course_name
      ) courses
    ), '[]'::json),
    'available_instructors', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', instructor_id,
          'name', instructor_name
        ) ORDER BY instructor_name NULLS LAST
      )
      FROM (
        SELECT DISTINCT instructor_id, instructor_name
        FROM response_stats
        WHERE instructor_id IS NOT NULL
      ) instructors
    ), '[]'::json)
  ) INTO result
  FROM summary_calc sc;

  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_course_reports_working(integer, text, integer, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_reports_working(integer, text, integer, uuid, boolean) TO anon;