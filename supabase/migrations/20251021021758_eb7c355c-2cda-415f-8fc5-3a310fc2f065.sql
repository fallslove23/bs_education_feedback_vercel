-- Recreate get_course_reports_working to use session_id instead of course_name
-- This function now properly uses sessions as the primary course identifier

CREATE OR REPLACE FUNCTION public.get_course_reports_working(
  p_year integer,
  p_session_id uuid DEFAULT NULL::uuid,  -- Changed from p_course_name to p_session_id
  p_round integer DEFAULT NULL::integer,
  p_instructor_id uuid DEFAULT NULL::uuid,
  p_include_test boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  WITH survey_base AS (
    SELECT DISTINCT
      s.id AS survey_id,
      s.education_year,
      s.education_round,
      s.title AS survey_title,
      -- Use session information as the primary "course" reference
      ses.id AS session_id,
      ses.title AS session_title,
      ses.year AS session_year,
      ses.turn AS session_turn,
      p.name AS program_name,
      -- Instructor mapping
      COALESCE(s.instructor_id, si.instructor_id) AS instructor_id,
      COALESCE(i1.name, i2.name, '강사 미지정') AS instructor_name,
      s.is_test
    FROM public.surveys s
    -- Join to sessions if session_id exists
    LEFT JOIN public.sessions ses ON ses.id = s.session_id
    LEFT JOIN public.programs p ON p.id = ses.program_id
    -- Survey instructors
    LEFT JOIN public.survey_instructors si ON s.id = si.survey_id
    LEFT JOIN public.instructors i1 ON s.instructor_id = i1.id
    LEFT JOIN public.instructors i2 ON si.instructor_id = i2.id
    WHERE s.education_year = p_year
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_session_id IS NULL OR s.session_id = p_session_id)
      AND (p_instructor_id IS NULL OR COALESCE(s.instructor_id, si.instructor_id) = p_instructor_id)
      AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false)
  ),
  -- All sessions for the given year (for dropdown options)
  all_sessions_base AS (
    SELECT DISTINCT
      ses.id AS session_id,
      ses.title AS session_title,
      ses.turn AS session_turn,
      p.name AS program_name
    FROM public.sessions ses
    LEFT JOIN public.programs p ON p.id = ses.program_id
    LEFT JOIN public.surveys s ON s.session_id = ses.id
    WHERE ses.year = p_year
      AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false OR s.id IS NULL)
  ),
  all_instructors AS (
    SELECT DISTINCT
      instructor_id,
      instructor_name
    FROM survey_base
    WHERE instructor_id IS NOT NULL
  ),
  response_stats AS (
    SELECT 
      sb.survey_id,
      sb.session_id,
      sb.education_year,
      sb.education_round,
      sb.session_title,
      sb.program_name,
      sb.instructor_id,
      sb.instructor_name,
      COUNT(sr.id) AS response_count,
      COUNT(DISTINCT CASE 
        WHEN sr.respondent_email IS NOT NULL AND sr.respondent_email <> '' 
        THEN lower(sr.respondent_email)
        ELSE sr.id::text
      END) AS respondent_count,
      -- Satisfaction calculations (scale to 10-point)
      AVG(CASE 
        WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END) AS avg_instructor_satisfaction,
      AVG(CASE 
        WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END) AS avg_course_satisfaction,
      AVG(CASE 
        WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END) AS avg_operation_satisfaction
    FROM survey_base sb
    LEFT JOIN public.survey_responses sr ON sr.survey_id = sb.survey_id
    LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
    LEFT JOIN public.survey_questions sq ON sq.id = qa.question_id
    GROUP BY 
      sb.survey_id, sb.session_id, sb.education_year, sb.education_round,
      sb.session_title, sb.program_name, sb.instructor_id, sb.instructor_name
  ),
  summary AS (
    SELECT json_build_object(
      'educationYear', p_year,
      'sessionId', p_session_id,
      'sessionTitle', (SELECT session_title FROM response_stats LIMIT 1),
      'programName', (SELECT program_name FROM response_stats LIMIT 1),
      'educationRound', p_round,
      'instructorId', p_instructor_id,
      'availableRounds', COALESCE(
        (SELECT json_agg(DISTINCT education_round ORDER BY education_round)
         FROM survey_base WHERE education_round IS NOT NULL), '[]'::json
      ),
      'totalSurveys', COALESCE((SELECT COUNT(DISTINCT survey_id)::int FROM response_stats), 0),
      'totalResponses', COALESCE((SELECT SUM(response_count)::int FROM response_stats), 0),
      'avgInstructorSatisfaction', (SELECT ROUND(AVG(avg_instructor_satisfaction)::numeric, 2) FROM response_stats),
      'avgCourseSatisfaction', (SELECT ROUND(AVG(avg_course_satisfaction)::numeric, 2) FROM response_stats),
      'avgOperationSatisfaction', (SELECT ROUND(AVG(avg_operation_satisfaction)::numeric, 2) FROM response_stats),
      'instructorCount', (SELECT COUNT(DISTINCT instructor_id)::int FROM all_instructors)
    ) AS data
  ),
  trend AS (
    SELECT json_agg(
      json_build_object(
        'educationRound', education_round,
        'avgInstructorSatisfaction', ROUND(AVG(avg_instructor_satisfaction)::numeric, 2),
        'avgCourseSatisfaction', ROUND(AVG(avg_course_satisfaction)::numeric, 2),
        'avgOperationSatisfaction', ROUND(AVG(avg_operation_satisfaction)::numeric, 2),
        'responseCount', SUM(response_count)::int
      ) ORDER BY education_round
    ) AS data
    FROM response_stats
    WHERE education_round IS NOT NULL
    GROUP BY education_round
  ),
  instructor_stats AS (
    SELECT json_agg(
      json_build_object(
        'instructorId', instructor_id,
        'instructorName', instructor_name,
        'surveyCount', COUNT(DISTINCT survey_id)::int,
        'responseCount', SUM(response_count)::int,
        'avgSatisfaction', ROUND(AVG((COALESCE(avg_instructor_satisfaction, 0) + 
                                       COALESCE(avg_course_satisfaction, 0) + 
                                       COALESCE(avg_operation_satisfaction, 0)) / 3)::numeric, 2)
      ) ORDER BY instructor_name
    ) AS data
    FROM response_stats
    WHERE instructor_id IS NOT NULL
    GROUP BY instructor_id, instructor_name
  ),
  textual_responses AS (
    SELECT json_agg(qa.answer_text ORDER BY sr.submitted_at DESC) AS data
    FROM survey_base sb
    JOIN public.survey_responses sr ON sr.survey_id = sb.survey_id
    JOIN public.question_answers qa ON qa.response_id = sr.id
    JOIN public.survey_questions sq ON sq.id = qa.question_id
    WHERE sq.question_type = 'text'
      AND qa.answer_text IS NOT NULL
      AND qa.answer_text <> ''
  ),
  available_sessions AS (
    SELECT json_agg(
      json_build_object(
        'sessionId', session_id,
        'displayName', session_turn || '차 ' || program_name,
        'sessionTitle', session_title,
        'programName', program_name,
        'turn', session_turn
      ) ORDER BY program_name, session_turn
    ) AS data
    FROM all_sessions_base
  ),
  available_instructors_list AS (
    SELECT json_agg(
      json_build_object(
        'id', instructor_id,
        'name', instructor_name
      ) ORDER BY instructor_name
    ) AS data
    FROM all_instructors
  )
  SELECT json_build_object(
    'summary', COALESCE((SELECT data FROM summary), '{}'::json),
    'trend', COALESCE((SELECT data FROM trend), '[]'::json),
    'instructor_stats', COALESCE((SELECT data FROM instructor_stats), '[]'::json),
    'textual_responses', COALESCE((SELECT data FROM textual_responses), '[]'::json),
    'available_sessions', COALESCE((SELECT data FROM available_sessions), '[]'::json),
    'available_instructors', COALESCE((SELECT data FROM available_instructors_list), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$function$;