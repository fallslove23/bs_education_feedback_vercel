-- Update get_course_reports_working to count unique respondents instead of raw responses
-- We preserve the same JSON shape so the frontend continues to work
CREATE OR REPLACE FUNCTION public.get_course_reports_working(
  p_year integer,
  p_course_name text DEFAULT NULL::text,
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
      s.course_name,
      s.instructor_id,
      i.name AS instructor_name,
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
      COUNT(sr.id) AS response_count, -- raw responses (kept for reference)
      -- Count unique respondents by email when present, otherwise by response id
      COUNT(DISTINCT CASE 
        WHEN sr.respondent_email IS NOT NULL AND sr.respondent_email <> '' THEN lower(sr.respondent_email)
        ELSE sr.id::text
      END) AS respondent_count,
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
    LEFT JOIN public.survey_responses sr ON sb.survey_id = sr.survey_id
      AND (p_include_test IS TRUE OR COALESCE(sr.is_test, false) = false)
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    GROUP BY sb.survey_id, sb.education_year, sb.education_round, sb.course_name, sb.instructor_id, sb.instructor_name
  ),
  summary_calc AS (
    SELECT
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_instructor_satisfaction IS NOT NULL THEN avg_instructor_satisfaction * respondent_count END), 0) AS sum_instr,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_course_satisfaction IS NOT NULL THEN avg_course_satisfaction * respondent_count END), 0) AS sum_course,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_operation_satisfaction IS NOT NULL THEN avg_operation_satisfaction * respondent_count END), 0) AS sum_oper,
      COALESCE(SUM(respondent_count), 0) AS total_responses
    FROM response_stats
  ),
  trend_pre AS (
    SELECT
      education_round,
      SUM(respondent_count) AS responses,
      CASE WHEN SUM(respondent_count) > 0 THEN ROUND(SUM(COALESCE(avg_instructor_satisfaction, 0) * respondent_count) / SUM(respondent_count), 2) ELSE NULL END AS avg_instr,
      CASE WHEN SUM(respondent_count) > 0 THEN ROUND(SUM(COALESCE(avg_course_satisfaction, 0) * respondent_count) / SUM(respondent_count), 2) ELSE NULL END AS avg_course,
      CASE WHEN SUM(respondent_count) > 0 THEN ROUND(SUM(COALESCE(avg_operation_satisfaction, 0) * respondent_count) / SUM(respondent_count), 2) ELSE NULL END AS avg_oper
    FROM response_stats
    GROUP BY education_round
  ),
  trend_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'educationRound', education_round,
          'avgInstructorSatisfaction', avg_instr,
          'avgCourseSatisfaction', avg_course,
          'avgOperationSatisfaction', avg_oper,
          'responseCount', responses
        )
        ORDER BY education_round
      ), '[]'::json
    ) AS trend
    FROM trend_pre
  ),
  instructor_pre AS (
    SELECT
      instructor_id,
      instructor_name,
      COUNT(*)::int AS survey_count,
      COALESCE(SUM(respondent_count), 0)::int AS responses,
      CASE WHEN COALESCE(SUM(respondent_count), 0) > 0 THEN ROUND(
        SUM(COALESCE(
          COALESCE(avg_instructor_satisfaction, avg_course_satisfaction, avg_operation_satisfaction),
          0
        ) * respondent_count) / NULLIF(SUM(respondent_count), 0), 2
      ) ELSE NULL END AS avg_overall
    FROM response_stats
    WHERE instructor_id IS NOT NULL
    GROUP BY instructor_id, instructor_name
  ),
  instructor_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'instructorId', instructor_id,
          'instructorName', instructor_name,
          'surveyCount', survey_count,
          'responseCount', responses,
          'avgSatisfaction', avg_overall
        )
        ORDER BY instructor_name NULLS LAST
      ), '[]'::json
    ) AS instructor_stats
    FROM instructor_pre
  ),
  available_courses_pre AS (
    SELECT 
      course_name,
      json_agg(DISTINCT education_round ORDER BY education_round) AS rounds
    FROM response_stats
    WHERE course_name IS NOT NULL
    GROUP BY course_name
  ),
  available_courses_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'normalizedName', course_name,
          'displayName', course_name,
          'rounds', rounds
        )
        ORDER BY course_name
      ), '[]'::json
    ) AS available_courses
    FROM available_courses_pre
  ),
  available_instructors_pre AS (
    SELECT DISTINCT instructor_id, instructor_name
    FROM response_stats
    WHERE instructor_id IS NOT NULL
  ),
  available_instructors_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', instructor_id,
          'name', instructor_name
        )
        ORDER BY instructor_name NULLS LAST
      ), '[]'::json
    ) AS available_instructors
    FROM available_instructors_pre
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
      'totalSurveys', (SELECT COUNT(*) FROM response_stats),
      'totalResponses', (SELECT total_responses FROM summary_calc),
      'avgInstructorSatisfaction', (
        SELECT CASE WHEN total_responses > 0 THEN ROUND(sum_instr / total_responses, 2) ELSE NULL END FROM summary_calc
      ),
      'avgCourseSatisfaction', (
        SELECT CASE WHEN total_responses > 0 THEN ROUND(sum_course / total_responses, 2) ELSE NULL END FROM summary_calc
      ),
      'avgOperationSatisfaction', (
        SELECT CASE WHEN total_responses > 0 THEN ROUND(sum_oper / total_responses, 2) ELSE NULL END FROM summary_calc
      ),
      'instructorCount', (SELECT COUNT(DISTINCT instructor_id) FROM response_stats WHERE instructor_id IS NOT NULL)
    ),
    'trend', (SELECT trend FROM trend_json),
    'instructor_stats', (SELECT instructor_stats FROM instructor_json),
    'textual_responses', '[]'::json,
    'available_courses', (SELECT available_courses FROM available_courses_json),
    'available_instructors', (SELECT available_instructors FROM available_instructors_json)
  ) INTO result;

  RETURN result;
END;
$function$;