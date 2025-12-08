
-- Drop all overloads of get_course_reports_working explicitly
DROP FUNCTION IF EXISTS get_course_reports_working(INTEGER, TEXT, INTEGER, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_course_reports_working(INTEGER, UUID, INTEGER, UUID, BOOLEAN);

-- Recreate with session_id support and survey_sessions support
CREATE OR REPLACE FUNCTION get_course_reports_working(
  p_year INTEGER,
  p_session_id TEXT DEFAULT NULL,
  p_round INTEGER DEFAULT NULL,
  p_instructor_id TEXT DEFAULT NULL,
  p_include_test BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
  v_trend JSONB;
  v_instructor_stats JSONB;
  v_textual_responses JSONB;
  v_available_sessions JSONB;
  v_available_instructors JSONB;
BEGIN
  -- Summary statistics
  WITH survey_data AS (
    SELECT 
      s.id as survey_id,
      s.education_year,
      s.education_round,
      s.session_id,
      ses.title as session_title,
      prog.name as program_name
    FROM surveys s
    LEFT JOIN sessions ses ON s.session_id = ses.id
    LEFT JOIN programs prog ON ses.program_id = prog.id
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
      AND (p_instructor_id IS NULL OR 
           s.instructor_id::TEXT = p_instructor_id OR
           EXISTS (
             SELECT 1 FROM survey_sessions ss 
             WHERE ss.survey_id = s.id AND ss.instructor_id::TEXT = p_instructor_id
           ))
  ),
  response_stats AS (
    SELECT 
      sd.survey_id,
      COUNT(sr.id) as response_count,
      AVG(CASE WHEN sq.question_text ILIKE '%강사%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_instructor_satisfaction,
      AVG(CASE WHEN sq.question_text ILIKE '%과정%만족도%' OR sq.question_text ILIKE '%강의%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_course_satisfaction,
      AVG(CASE WHEN sq.question_text ILIKE '%운영%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_operation_satisfaction
    FROM survey_data sd
    LEFT JOIN survey_responses sr ON sr.survey_id = sd.survey_id
      AND (p_include_test OR sr.is_test IS NULL OR sr.is_test = FALSE)
    LEFT JOIN question_answers qa ON qa.response_id = sr.id
    LEFT JOIN survey_questions sq ON sq.id = qa.question_id
    GROUP BY sd.survey_id
  ),
  unique_instructors AS (
    SELECT DISTINCT 
      COALESCE(s.instructor_id, ss.instructor_id) as instructor_id
    FROM survey_data sd
    JOIN surveys s ON s.id = sd.survey_id
    LEFT JOIN survey_sessions ss ON ss.survey_id = s.id
    WHERE COALESCE(s.instructor_id, ss.instructor_id) IS NOT NULL
  )
  SELECT jsonb_build_object(
    'educationYear', p_year,
    'sessionId', (SELECT session_id::TEXT FROM survey_data LIMIT 1),
    'sessionTitle', (SELECT session_title FROM survey_data LIMIT 1),
    'programName', (SELECT program_name FROM survey_data LIMIT 1),
    'educationRound', p_round,
    'instructorId', p_instructor_id,
    'availableRounds', (SELECT jsonb_agg(DISTINCT education_round ORDER BY education_round DESC) FROM survey_data),
    'totalSurveys', (SELECT COUNT(DISTINCT survey_id) FROM survey_data),
    'totalResponses', (SELECT COALESCE(SUM(response_count), 0) FROM response_stats),
    'avgInstructorSatisfaction', (SELECT AVG(avg_instructor_satisfaction) FROM response_stats WHERE avg_instructor_satisfaction IS NOT NULL),
    'avgCourseSatisfaction', (SELECT AVG(avg_course_satisfaction) FROM response_stats WHERE avg_course_satisfaction IS NOT NULL),
    'avgOperationSatisfaction', (SELECT AVG(avg_operation_satisfaction) FROM response_stats WHERE avg_operation_satisfaction IS NOT NULL),
    'instructorCount', (SELECT COUNT(*) FROM unique_instructors)
  ) INTO v_summary;

  -- Trend data (by round)
  WITH survey_data AS (
    SELECT 
      s.id as survey_id,
      s.education_round
    FROM surveys s
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
      AND (p_instructor_id IS NULL OR 
           s.instructor_id::TEXT = p_instructor_id OR
           EXISTS (SELECT 1 FROM survey_sessions ss WHERE ss.survey_id = s.id AND ss.instructor_id::TEXT = p_instructor_id))
  ),
  trend_data AS (
    SELECT 
      sd.education_round,
      COUNT(DISTINCT sr.id) as response_count,
      AVG(CASE WHEN sq.question_text ILIKE '%강사%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_instructor_satisfaction,
      AVG(CASE WHEN sq.question_text ILIKE '%과정%만족도%' OR sq.question_text ILIKE '%강의%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_course_satisfaction,
      AVG(CASE WHEN sq.question_text ILIKE '%운영%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_operation_satisfaction
    FROM survey_data sd
    LEFT JOIN survey_responses sr ON sr.survey_id = sd.survey_id
      AND (p_include_test OR sr.is_test IS NULL OR sr.is_test = FALSE)
    LEFT JOIN question_answers qa ON qa.response_id = sr.id
    LEFT JOIN survey_questions sq ON sq.id = qa.question_id
    GROUP BY sd.education_round
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'educationRound', education_round,
      'avgInstructorSatisfaction', avg_instructor_satisfaction,
      'avgCourseSatisfaction', avg_course_satisfaction,
      'avgOperationSatisfaction', avg_operation_satisfaction,
      'responseCount', response_count
    ) ORDER BY education_round
  ) INTO v_trend FROM trend_data;

  -- Instructor statistics (considering both surveys.instructor_id and survey_sessions)
  WITH all_instructor_surveys AS (
    -- Surveys with instructor_id
    SELECT 
      s.id as survey_id,
      s.instructor_id,
      i.name as instructor_name
    FROM surveys s
    INNER JOIN instructors i ON s.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
      AND (p_instructor_id IS NULL OR s.instructor_id::TEXT = p_instructor_id)
    
    UNION
    
    -- Surveys with survey_sessions mapping
    SELECT 
      ss.survey_id,
      ss.instructor_id,
      i.name as instructor_name
    FROM survey_sessions ss
    INNER JOIN surveys s ON ss.survey_id = s.id
    INNER JOIN instructors i ON ss.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
      AND (p_instructor_id IS NULL OR ss.instructor_id::TEXT = p_instructor_id)
  ),
  instructor_stats AS (
    SELECT 
      ais.instructor_id,
      ais.instructor_name,
      COUNT(DISTINCT ais.survey_id) as survey_count,
      COUNT(DISTINCT sr.id) as response_count,
      AVG(CASE WHEN sq.question_text ILIKE '%강사%만족도%' THEN (qa.answer_value::NUMERIC) END) as avg_satisfaction
    FROM all_instructor_surveys ais
    LEFT JOIN survey_responses sr ON sr.survey_id = ais.survey_id
      AND (p_include_test OR sr.is_test IS NULL OR sr.is_test = FALSE)
    LEFT JOIN question_answers qa ON qa.response_id = sr.id
    LEFT JOIN survey_questions sq ON sq.id = qa.question_id
    GROUP BY ais.instructor_id, ais.instructor_name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'instructorId', instructor_id::TEXT,
      'instructorName', instructor_name,
      'surveyCount', survey_count,
      'responseCount', response_count,
      'avgSatisfaction', avg_satisfaction
    ) ORDER BY avg_satisfaction DESC NULLS LAST, response_count DESC
  ) INTO v_instructor_stats FROM instructor_stats;

  -- Textual responses
  WITH survey_data AS (
    SELECT s.id as survey_id
    FROM surveys s
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
      AND (p_instructor_id IS NULL OR 
           s.instructor_id::TEXT = p_instructor_id OR
           EXISTS (SELECT 1 FROM survey_sessions ss WHERE ss.survey_id = s.id AND ss.instructor_id::TEXT = p_instructor_id))
  )
  SELECT jsonb_agg(DISTINCT qa.answer_text)
  INTO v_textual_responses
  FROM survey_data sd
  JOIN survey_responses sr ON sr.survey_id = sd.survey_id
    AND (p_include_test OR sr.is_test IS NULL OR sr.is_test = FALSE)
  JOIN question_answers qa ON qa.response_id = sr.id
  JOIN survey_questions sq ON sq.id = qa.question_id
  WHERE sq.question_type IN ('text', 'textarea', 'long_text')
    AND qa.answer_text IS NOT NULL
    AND qa.answer_text != ''
  LIMIT 1000;

  -- Available sessions for the year
  SELECT jsonb_agg(
    jsonb_build_object(
      'sessionId', ses.id::TEXT,
      'displayName', ses.year::TEXT || '년 ' || ses.turn::TEXT || '차 ' || COALESCE(prog.name, ses.title, '과정 미정'),
      'sessionTitle', ses.title,
      'programName', prog.name,
      'turn', ses.turn
    ) ORDER BY ses.turn DESC
  )
  INTO v_available_sessions
  FROM sessions ses
  LEFT JOIN programs prog ON ses.program_id = prog.id
  WHERE ses.year = p_year
    AND EXISTS (
      SELECT 1 FROM surveys s 
      WHERE s.session_id = ses.id 
        AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
    );

  -- Available instructors
  WITH all_instructors AS (
    SELECT DISTINCT i.id, i.name
    FROM surveys s
    INNER JOIN instructors i ON (
      s.instructor_id = i.id OR
      EXISTS (SELECT 1 FROM survey_sessions ss WHERE ss.survey_id = s.id AND ss.instructor_id = i.id)
    )
    WHERE s.education_year = p_year
      AND (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_include_test OR s.is_test IS NULL OR s.is_test = FALSE)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id::TEXT,
      'name', name
    ) ORDER BY name
  )
  INTO v_available_instructors
  FROM all_instructors;

  -- Return complete response
  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, '{}'::JSONB),
    'trend', COALESCE(v_trend, '[]'::JSONB),
    'instructor_stats', COALESCE(v_instructor_stats, '[]'::JSONB),
    'textual_responses', COALESCE(v_textual_responses, '[]'::JSONB),
    'available_sessions', COALESCE(v_available_sessions, '[]'::JSONB),
    'available_instructors', COALESCE(v_available_instructors, '[]'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_reports_working TO authenticated, anon;

COMMENT ON FUNCTION get_course_reports_working IS 'Returns comprehensive course report statistics including data from survey_sessions table for multi-instructor surveys. Uses session_id (UUID as TEXT) instead of course_name.';
