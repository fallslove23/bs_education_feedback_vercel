
-- Update get_course_reports_working RPC to filter instructors by user_role
-- This ensures only users with 'instructor' role are included in statistics

CREATE OR REPLACE FUNCTION get_course_reports_working(
  p_year integer,
  p_session_id uuid DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  summary_data jsonb;
  trend_data jsonb[];
  instructor_stats_data jsonb[];
  textual_responses_data text[];
  available_sessions_data jsonb[];
  available_instructors_data jsonb[];
BEGIN
  -- Build summary
  WITH filtered_surveys AS (
    SELECT s.*
    FROM surveys s
    INNER JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR EXISTS (
        SELECT 1 FROM session_course_map scm 
        WHERE scm.survey_id = s.id AND scm.session_id = p_session_id
      ))
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test OR s.is_test = false)
      AND (i.user_id IS NULL OR ur.role = 'instructor')  -- Only include instructors with instructor role
  ),
  survey_responses_filtered AS (
    SELECT sr.*
    FROM survey_responses sr
    WHERE sr.survey_id IN (SELECT id FROM filtered_surveys)
  ),
  question_answers_filtered AS (
    SELECT qa.*, sq.satisfaction_type, sq.question_type
    FROM question_answers qa
    INNER JOIN survey_questions sq ON sq.id = qa.question_id
    WHERE qa.response_id IN (SELECT id FROM survey_responses_filtered)
  )
  SELECT jsonb_build_object(
    'educationYear', p_year,
    'sessionId', p_session_id,
    'sessionTitle', (SELECT session_title FROM program_sessions_v1 WHERE session_id = p_session_id LIMIT 1),
    'programName', (SELECT program FROM program_sessions_v1 WHERE session_id = p_session_id LIMIT 1),
    'educationRound', p_round,
    'instructorId', p_instructor_id,
    'availableRounds', COALESCE((
      SELECT jsonb_agg(DISTINCT education_round ORDER BY education_round)
      FROM filtered_surveys
      WHERE education_round IS NOT NULL
    ), '[]'::jsonb),
    'totalSurveys', (SELECT COUNT(*) FROM filtered_surveys),
    'totalResponses', (SELECT COUNT(*) FROM survey_responses_filtered),
    'avgInstructorSatisfaction', (
      SELECT AVG(CAST(qa.answer_value AS numeric))
      FROM question_answers_filtered qa
      WHERE qa.satisfaction_type = 'instructor'
        AND qa.question_type IN ('scale', 'rating')
        AND qa.answer_value IS NOT NULL
    ),
    'avgCourseSatisfaction', (
      SELECT AVG(CAST(qa.answer_value AS numeric))
      FROM question_answers_filtered qa
      WHERE qa.satisfaction_type = 'course'
        AND qa.question_type IN ('scale', 'rating')
        AND qa.answer_value IS NOT NULL
    ),
    'avgOperationSatisfaction', (
      SELECT AVG(CAST(qa.answer_value AS numeric))
      FROM question_answers_filtered qa
      WHERE qa.satisfaction_type = 'operation'
        AND qa.question_type IN ('scale', 'rating')
        AND qa.answer_value IS NOT NULL
    ),
    'instructorCount', (SELECT COUNT(DISTINCT instructor_id) FROM filtered_surveys)
  ) INTO summary_data;

  -- Build trend data (by round)
  WITH filtered_surveys AS (
    SELECT s.*
    FROM surveys s
    INNER JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR EXISTS (
        SELECT 1 FROM session_course_map scm 
        WHERE scm.survey_id = s.id AND scm.session_id = p_session_id
      ))
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test OR s.is_test = false)
      AND (i.user_id IS NULL OR ur.role = 'instructor')
  ),
  survey_responses_filtered AS (
    SELECT sr.*
    FROM survey_responses sr
    WHERE sr.survey_id IN (SELECT id FROM filtered_surveys)
  ),
  question_answers_filtered AS (
    SELECT qa.*, sq.satisfaction_type, sq.question_type, s.education_round
    FROM question_answers qa
    INNER JOIN survey_questions sq ON sq.id = qa.question_id
    INNER JOIN survey_responses sr ON sr.id = qa.response_id
    INNER JOIN filtered_surveys s ON s.id = sr.survey_id
  )
  SELECT array_agg(
    jsonb_build_object(
      'educationRound', education_round,
      'avgInstructorSatisfaction', avg_instructor,
      'avgCourseSatisfaction', avg_course,
      'avgOperationSatisfaction', avg_operation,
      'responseCount', response_count
    ) ORDER BY education_round
  ) INTO trend_data
  FROM (
    SELECT 
      education_round,
      AVG(CASE WHEN satisfaction_type = 'instructor' AND question_type IN ('scale', 'rating') 
          THEN CAST(answer_value AS numeric) END) as avg_instructor,
      AVG(CASE WHEN satisfaction_type = 'course' AND question_type IN ('scale', 'rating') 
          THEN CAST(answer_value AS numeric) END) as avg_course,
      AVG(CASE WHEN satisfaction_type = 'operation' AND question_type IN ('scale', 'rating') 
          THEN CAST(answer_value AS numeric) END) as avg_operation,
      COUNT(DISTINCT response_id) as response_count
    FROM question_answers_filtered
    WHERE education_round IS NOT NULL
    GROUP BY education_round
  ) t;

  -- Build instructor stats
  WITH filtered_surveys AS (
    SELECT s.*
    FROM surveys s
    INNER JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR EXISTS (
        SELECT 1 FROM session_course_map scm 
        WHERE scm.survey_id = s.id AND scm.session_id = p_session_id
      ))
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test OR s.is_test = false)
      AND (i.user_id IS NULL OR ur.role = 'instructor')
  ),
  survey_responses_filtered AS (
    SELECT sr.*, s.instructor_id
    FROM survey_responses sr
    INNER JOIN filtered_surveys s ON s.id = sr.survey_id
  ),
  question_answers_filtered AS (
    SELECT qa.*, sq.satisfaction_type, sq.question_type, sr.instructor_id
    FROM question_answers qa
    INNER JOIN survey_questions sq ON sq.id = qa.question_id
    INNER JOIN survey_responses_filtered sr ON sr.id = qa.response_id
  )
  SELECT array_agg(
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
      i.id as instructor_id,
      i.name as instructor_name,
      COUNT(DISTINCT fs.id) as survey_count,
      COUNT(DISTINCT sr.id) as response_count,
      AVG(CASE WHEN qa.satisfaction_type = 'instructor' AND qa.question_type IN ('scale', 'rating')
          THEN CAST(qa.answer_value AS numeric) END) as avg_satisfaction
    FROM instructors i
    INNER JOIN filtered_surveys fs ON fs.instructor_id = i.id
    LEFT JOIN survey_responses_filtered sr ON sr.instructor_id = i.id
    LEFT JOIN question_answers_filtered qa ON qa.response_id = sr.id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE i.user_id IS NULL OR ur.role = 'instructor'
    GROUP BY i.id, i.name
  ) t;

  -- Build textual responses
  WITH filtered_surveys AS (
    SELECT s.*
    FROM surveys s
    INNER JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR EXISTS (
        SELECT 1 FROM session_course_map scm 
        WHERE scm.survey_id = s.id AND scm.session_id = p_session_id
      ))
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_include_test OR s.is_test = false)
      AND (i.user_id IS NULL OR ur.role = 'instructor')
  )
  SELECT array_agg(answer_text) INTO textual_responses_data
  FROM (
    SELECT DISTINCT qa.answer_text
    FROM question_answers qa
    INNER JOIN survey_responses sr ON sr.id = qa.response_id
    INNER JOIN filtered_surveys s ON s.id = sr.survey_id
    INNER JOIN survey_questions sq ON sq.id = qa.question_id
    WHERE sq.question_type = 'text'
      AND qa.answer_text IS NOT NULL
      AND qa.answer_text != ''
    LIMIT 100
  ) t;

  -- Build available sessions
  SELECT array_agg(
    jsonb_build_object(
      'sessionId', session_id,
      'displayName', program || ' ' || turn || '회차 - ' || session_title,
      'sessionTitle', session_title,
      'programName', program,
      'turn', turn
    )
  ) INTO available_sessions_data
  FROM (
    SELECT DISTINCT psv.session_id, psv.session_title, psv.program, psv.turn
    FROM program_sessions_v1 psv
    WHERE psv.year = p_year
    ORDER BY psv.program, psv.turn
  ) t;

  -- Build available instructors (only those with instructor role)
  WITH filtered_surveys AS (
    SELECT DISTINCT s.instructor_id
    FROM surveys s
    INNER JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR EXISTS (
        SELECT 1 FROM session_course_map scm 
        WHERE scm.survey_id = s.id AND scm.session_id = p_session_id
      ))
      AND (i.user_id IS NULL OR ur.role = 'instructor')
  )
  SELECT array_agg(
    jsonb_build_object(
      'id', i.id,
      'name', i.name
    )
  ) INTO available_instructors_data
  FROM instructors i
  INNER JOIN filtered_surveys fs ON fs.instructor_id = i.id
  LEFT JOIN user_roles ur ON ur.user_id = i.user_id AND ur.role = 'instructor'
  WHERE i.user_id IS NULL OR ur.role = 'instructor';

  -- Build final result
  result := jsonb_build_object(
    'summary', summary_data,
    'trend', COALESCE(trend_data, '[]'::jsonb[]),
    'instructor_stats', COALESCE(instructor_stats_data, '[]'::jsonb[]),
    'textual_responses', COALESCE(textual_responses_data, '{}'::text[]),
    'available_sessions', COALESCE(available_sessions_data, '[]'::jsonb[]),
    'available_instructors', COALESCE(available_instructors_data, '[]'::jsonb[])
  );

  RETURN result;
END;
$$;
