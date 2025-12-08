-- Fix available_courses to show all courses regardless of selected course filter

DROP FUNCTION IF EXISTS public.get_course_reports_working(integer, text, integer, uuid, boolean);

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
  p_course_normalized text := public.normalize_course_name(p_course_name);
BEGIN
  WITH survey_base AS (
    SELECT DISTINCT
      s.id AS survey_id,
      s.education_year,
      s.education_round,
      COALESCE(s.course_name, c_ss.title, c_s.title) AS course_name,
      public.normalize_course_name(COALESCE(s.course_name, c_ss.title, c_s.title)) AS normalized_course_name,
      ss.id AS session_id,
      COALESCE(ss.session_name, s.title) AS session_title,
      COALESCE(ss.instructor_id, s.instructor_id, si.instructor_id) AS instructor_id,
      COALESCE(i3.name, i1.name, i2.name, '강사 미지정') AS instructor_name,
      s.is_test
    FROM public.surveys s
    LEFT JOIN public.survey_sessions ss ON ss.survey_id = s.id
    LEFT JOIN public.survey_instructors si ON s.id = si.survey_id
    LEFT JOIN public.instructors i1 ON s.instructor_id = i1.id
    LEFT JOIN public.instructors i2 ON si.instructor_id = i2.id
    LEFT JOIN public.instructors i3 ON ss.instructor_id = i3.id
    LEFT JOIN public.courses c_ss ON ss.course_id = c_ss.id
    LEFT JOIN public.courses c_s ON s.course_id = c_s.id
    WHERE s.education_year = p_year
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (
        p_course_name IS NULL 
        OR public.normalize_course_name(COALESCE(s.course_name, c_ss.title, c_s.title)) = p_course_normalized
      )
      AND (p_instructor_id IS NULL OR COALESCE(ss.instructor_id, s.instructor_id, si.instructor_id) = p_instructor_id)
      AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false)
  ),
  -- Separate survey_base for all courses (year-only filter for dropdown options)
  all_courses_base AS (
    SELECT DISTINCT
      s.education_year,
      s.education_round,
      COALESCE(s.course_name, c_ss.title, c_s.title) AS course_name,
      public.normalize_course_name(COALESCE(s.course_name, c_ss.title, c_s.title)) AS normalized_course_name,
      COALESCE(ss.session_name, s.title) AS session_title
    FROM public.surveys s
    LEFT JOIN public.survey_sessions ss ON ss.survey_id = s.id
    LEFT JOIN public.courses c_ss ON ss.course_id = c_ss.id
    LEFT JOIN public.courses c_s ON s.course_id = c_s.id
    WHERE s.education_year = p_year
      AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false)
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
      sb.course_name,
      sb.normalized_course_name,
      sb.session_title,
      sb.instructor_id,
      sb.instructor_name,
      COUNT(sr.id) AS response_count,
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
    LEFT JOIN public.survey_responses sr 
      ON sr.survey_id = sb.survey_id
      AND (p_include_test IS TRUE OR COALESCE(sr.is_test, false) = false)
      AND (
        (sb.session_id IS NOT NULL AND sr.session_id = sb.session_id)
        OR 
        (sb.session_id IS NOT NULL AND sr.session_id IS NULL AND sb.session_id = (
          SELECT ss2.id FROM public.survey_sessions ss2 WHERE ss2.survey_id = sb.survey_id ORDER BY ss2.id ASC LIMIT 1
        ))
        OR
        (sb.session_id IS NULL)
      )
    LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
    LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
    GROUP BY sb.survey_id, sb.session_id, sb.education_year, sb.education_round, sb.course_name, sb.normalized_course_name, sb.session_title, sb.instructor_id, sb.instructor_name
  ),
  summary_calc AS (
    SELECT
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN avg_instructor_satisfaction * respondent_count END), 0) AS sum_instr,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN avg_course_satisfaction * respondent_count END), 0) AS sum_course,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN avg_operation_satisfaction * respondent_count END), 0) AS sum_oper,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN respondent_count END), 0) AS denom_instr,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN respondent_count END), 0) AS denom_course,
      COALESCE(SUM(CASE WHEN respondent_count > 0 AND avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN respondent_count END), 0) AS denom_oper,
      COALESCE(SUM(respondent_count), 0) AS total_responses
    FROM response_stats
  ),
  trend_pre AS (
    SELECT
      education_round,
      SUM(respondent_count) AS responses,
      SUM(CASE WHEN avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN avg_instructor_satisfaction * respondent_count END) AS sum_instr,
      SUM(CASE WHEN avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN avg_course_satisfaction * respondent_count END) AS sum_course,
      SUM(CASE WHEN avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN avg_operation_satisfaction * respondent_count END) AS sum_oper,
      SUM(CASE WHEN avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN respondent_count END) AS denom_instr,
      SUM(CASE WHEN avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN respondent_count END) AS denom_course,
      SUM(CASE WHEN avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN respondent_count END) AS denom_oper
    FROM response_stats
    GROUP BY education_round
  ),
  trend_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'educationRound', education_round,
          'avgInstructorSatisfaction', CASE WHEN denom_instr > 0 THEN ROUND(sum_instr / denom_instr, 2) ELSE NULL END,
          'avgCourseSatisfaction', CASE WHEN denom_course > 0 THEN ROUND(sum_course / denom_course, 2) ELSE NULL END,
          'avgOperationSatisfaction', CASE WHEN denom_oper > 0 THEN ROUND(sum_oper / denom_oper, 2) ELSE NULL END,
          'responseCount', responses
        )
        ORDER BY education_round
      ), '[]'::json
    ) AS trend
    FROM trend_pre
  ),
  instructor_pre AS (
    SELECT
      ai.instructor_id,
      ai.instructor_name,
      COALESCE(COUNT(DISTINCT rs.survey_id)::int, 0) AS survey_count,
      COALESCE(SUM(rs.respondent_count), 0)::int AS responses,
      SUM(CASE WHEN rs.avg_instructor_satisfaction IS NOT NULL AND rs.avg_instructor_satisfaction > 0 THEN rs.avg_instructor_satisfaction * rs.respondent_count END) AS sum_instr,
      SUM(CASE WHEN rs.avg_course_satisfaction IS NOT NULL AND rs.avg_course_satisfaction > 0 THEN rs.avg_course_satisfaction * rs.respondent_count END) AS sum_course,
      SUM(CASE WHEN rs.avg_operation_satisfaction IS NOT NULL AND rs.avg_operation_satisfaction > 0 THEN rs.avg_operation_satisfaction * rs.respondent_count END) AS sum_oper,
      SUM(CASE WHEN rs.avg_instructor_satisfaction IS NOT NULL AND rs.avg_instructor_satisfaction > 0 THEN rs.respondent_count END) AS denom_instr,
      SUM(CASE WHEN rs.avg_course_satisfaction IS NOT NULL AND rs.avg_course_satisfaction > 0 THEN rs.respondent_count END) AS denom_course,
      SUM(CASE WHEN rs.avg_operation_satisfaction IS NOT NULL AND rs.avg_operation_satisfaction > 0 THEN rs.respondent_count END) AS denom_oper
    FROM all_instructors ai
    LEFT JOIN response_stats rs ON ai.instructor_id = rs.instructor_id
    GROUP BY ai.instructor_id, ai.instructor_name
  ),
  instructor_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'instructorId', instructor_id,
          'instructorName', instructor_name,
          'surveyCount', survey_count,
          'responseCount', responses,
          'avgSatisfaction', CASE 
            WHEN denom_instr > 0 THEN ROUND(sum_instr / denom_instr, 2)
            WHEN denom_course > 0 THEN ROUND(sum_course / denom_course, 2)
            WHEN denom_oper > 0 THEN ROUND(sum_oper / denom_oper, 2)
            ELSE 0
          END
        )
        ORDER BY instructor_name NULLS LAST
      ), '[]'::json
    ) AS instructor_stats
    FROM instructor_pre
  ),
  -- Use all_courses_base for dropdown (year-only filter)
  available_courses_pre AS (
    SELECT 
      normalized_course_name AS normalized_name,
      MAX(session_title) AS display_name,
      json_agg(DISTINCT education_round ORDER BY education_round) AS rounds
    FROM all_courses_base
    WHERE course_name IS NOT NULL
    GROUP BY normalized_course_name
  ),
  available_courses_json AS (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'normalizedName', normalized_name,
          'displayName', display_name,
          'rounds', rounds
        )
        ORDER BY display_name
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
      'courseName', COALESCE((SELECT MAX(session_title) FROM response_stats), p_course_name),
      'normalizedCourseName', p_course_normalized,
      'educationRound', p_round,
      'instructorId', p_instructor_id,
      'availableRounds', COALESCE((
        SELECT json_agg(DISTINCT education_round ORDER BY education_round)
        FROM response_stats
      ), '[]'::json),
      'totalSurveys', (SELECT COUNT(*) FROM response_stats),
      'totalResponses', (SELECT total_responses FROM summary_calc),
      'avgInstructorSatisfaction', (
        SELECT CASE WHEN denom_instr > 0 THEN ROUND(sum_instr / denom_instr, 2) ELSE NULL END FROM summary_calc
      ),
      'avgCourseSatisfaction', (
        SELECT CASE WHEN denom_course > 0 THEN ROUND(sum_course / denom_course, 2) ELSE NULL END FROM summary_calc
      ),
      'avgOperationSatisfaction', (
        SELECT CASE WHEN denom_oper > 0 THEN ROUND(sum_oper / denom_oper, 2) ELSE NULL END FROM summary_calc
      ),
      'instructorCount', (SELECT COUNT(*) FROM all_instructors)
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