-- Create a new course report function that bypasses the problematic survey_aggregates view
CREATE OR REPLACE FUNCTION public.course_report_statistics_fixed(
  p_year integer,
  p_course_name text DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE (
  summary json,
  trend json,
  instructor_stats json,
  textual_responses json,
  available_courses json,
  available_instructors json
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH survey_data AS (
  SELECT
    s.id as survey_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.instructor_id,
    i.name as instructor_name,
    s.is_test,
    COUNT(sr.id) as response_count,
    -- Calculate satisfaction scores directly from the raw data
    AVG(CASE 
      WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating') 
      THEN CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'number' THEN (qa.answer_value::text)::numeric
        WHEN qa.answer_text ~ '^[0-9]+(\.[0-9]+)?$' THEN qa.answer_text::numeric
        ELSE NULL
      END
    END) as avg_instructor_satisfaction,
    AVG(CASE 
      WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating') 
      THEN CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'number' THEN (qa.answer_value::text)::numeric
        WHEN qa.answer_text ~ '^[0-9]+(\.[0-9]+)?$' THEN qa.answer_text::numeric
        ELSE NULL
      END
    END) as avg_course_satisfaction,
    AVG(CASE 
      WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating') 
      THEN CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'number' THEN (qa.answer_value::text)::numeric
        WHEN qa.answer_text ~ '^[0-9]+(\.[0-9]+)?$' THEN qa.answer_text::numeric
        ELSE NULL
      END
    END) as avg_operation_satisfaction
  FROM public.surveys s
  LEFT JOIN public.instructors i ON s.instructor_id = i.id
  LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id AND (p_include_test IS TRUE OR COALESCE(sr.is_test, false) = false)
  LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
  LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE s.education_year = p_year
    AND (p_round IS NULL OR s.education_round = p_round)
    AND (p_course_name IS NULL OR s.course_name = p_course_name)
    AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
    AND (p_include_test IS TRUE OR COALESCE(s.is_test, false) = false)
  GROUP BY s.id, s.education_year, s.education_round, s.course_name, s.instructor_id, i.name, s.is_test
),
summary_data AS (
  SELECT
    jsonb_build_object(
      'educationYear', p_year,
      'courseName', p_course_name,
      'normalizedCourseName', p_course_name,
      'educationRound', p_round,
      'instructorId', p_instructor_id::text,
      'availableRounds', COALESCE((
        SELECT jsonb_agg(DISTINCT education_round ORDER BY education_round)
        FROM survey_data
      ), '[]'::jsonb),
      'totalSurveys', (SELECT COUNT(*) FROM survey_data),
      'totalResponses', (SELECT SUM(response_count) FROM survey_data),
      'avgInstructorSatisfaction', (
        SELECT CASE 
          WHEN SUM(response_count) > 0 THEN 
            ROUND(SUM(avg_instructor_satisfaction * response_count) / SUM(response_count), 2)
          ELSE NULL 
        END
        FROM survey_data 
        WHERE avg_instructor_satisfaction IS NOT NULL
      ),
      'avgCourseSatisfaction', (
        SELECT CASE 
          WHEN SUM(response_count) > 0 THEN 
            ROUND(SUM(avg_course_satisfaction * response_count) / SUM(response_count), 2)
          ELSE NULL 
        END
        FROM survey_data 
        WHERE avg_course_satisfaction IS NOT NULL
      ),
      'avgOperationSatisfaction', (
        SELECT CASE 
          WHEN SUM(response_count) > 0 THEN 
            ROUND(SUM(avg_operation_satisfaction * response_count) / SUM(response_count), 2)
          ELSE NULL 
        END
        FROM survey_data 
        WHERE avg_operation_satisfaction IS NOT NULL
      ),
      'instructorCount', (SELECT COUNT(DISTINCT instructor_id) FROM survey_data WHERE instructor_id IS NOT NULL)
    ) as summary
),
trend_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'educationRound', education_round,
        'avgInstructorSatisfaction', ROUND(AVG(avg_instructor_satisfaction), 2),
        'avgCourseSatisfaction', ROUND(AVG(avg_course_satisfaction), 2),
        'avgOperationSatisfaction', ROUND(AVG(avg_operation_satisfaction), 2),
        'responseCount', SUM(response_count)
      ) ORDER BY education_round
    ), '[]'::jsonb
  ) as trend
  FROM survey_data
  GROUP BY education_round
),
instructor_stats_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'instructorId', instructor_id::text,
        'instructorName', COALESCE(instructor_name, 'Unknown'),
        'surveyCount', COUNT(*),
        'responseCount', SUM(response_count),
        'avgSatisfaction', ROUND(AVG(
          COALESCE(avg_instructor_satisfaction, avg_course_satisfaction, avg_operation_satisfaction)
        ), 2)
      ) ORDER BY instructor_name NULLS LAST
    ), '[]'::jsonb
  ) as instructor_stats
  FROM survey_data
  WHERE instructor_id IS NOT NULL
  GROUP BY instructor_id, instructor_name
),
available_courses_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'normalizedName', course_name,
        'displayName', course_name,
        'rounds', rounds
      ) ORDER BY course_name
    ), '[]'::jsonb
  ) as available_courses
  FROM (
    SELECT 
      course_name,
      jsonb_agg(DISTINCT education_round ORDER BY education_round) as rounds
    FROM survey_data
    WHERE course_name IS NOT NULL
    GROUP BY course_name
  ) courses
),
available_instructors_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', instructor_id::text,
        'name', instructor_name
      ) ORDER BY instructor_name NULLS LAST
    ), '[]'::jsonb
  ) as available_instructors
  FROM (
    SELECT DISTINCT instructor_id, instructor_name
    FROM survey_data
    WHERE instructor_id IS NOT NULL
  ) instructors
)
SELECT
  (SELECT summary FROM summary_data)::json,
  (SELECT trend FROM trend_data)::json,
  (SELECT instructor_stats FROM instructor_stats_data)::json,
  '[]'::json as textual_responses,
  (SELECT available_courses FROM available_courses_data)::json,
  (SELECT available_instructors FROM available_instructors_data)::json;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.course_report_statistics_fixed(integer, text, integer, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_report_statistics_fixed(integer, text, integer, uuid, boolean) TO anon;