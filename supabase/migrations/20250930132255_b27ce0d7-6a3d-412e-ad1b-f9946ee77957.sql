-- Update course_report_statistics to exclude 0.0 values from averages and count only instructors with responses > 0
CREATE OR REPLACE FUNCTION public.course_report_statistics(
  p_year integer,
  p_course_name text DEFAULT NULL::text,
  p_round integer DEFAULT NULL::integer,
  p_instructor_id uuid DEFAULT NULL::uuid,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE(
  summary json,
  trend json,
  instructor_stats json,
  textual_responses json,
  available_courses json,
  available_instructors json
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT
    sa.survey_id,
    sa.education_year,
    sa.education_round,
    sa.course_name,
    sa.instructor_id,
    sa.instructor_name,
    sa.is_test,
    COALESCE(sa.response_count, 0)::int AS response_count,
    public.safe_numeric_convert(sa.avg_overall_satisfaction::text) AS avg_overall_satisfaction,
    public.safe_numeric_convert(sa.avg_course_satisfaction::text) AS avg_course_satisfaction,
    public.safe_numeric_convert(sa.avg_instructor_satisfaction::text) AS avg_instructor_satisfaction,
    public.safe_numeric_convert(sa.avg_operation_satisfaction::text) AS avg_operation_satisfaction
  FROM public.survey_aggregates sa
  WHERE sa.education_year = p_year
    AND (p_round IS NULL OR sa.education_round = p_round)
    AND (p_course_name IS NULL OR sa.course_name = p_course_name)
    AND (p_instructor_id IS NULL OR sa.instructor_id = p_instructor_id)
    AND (p_include_test IS TRUE OR COALESCE(sa.is_test, false) = false)
),
-- Only include positive (> 0) averages in weighted sums and denominators
summary_calc AS (
  SELECT
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0
                      THEN avg_instructor_satisfaction * response_count END), 0) AS sum_instr,
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0
                      THEN avg_course_satisfaction * response_count END), 0) AS sum_course,
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0
                      THEN avg_operation_satisfaction * response_count END), 0) AS sum_oper,
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN response_count END), 0) AS denom_instr,
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN response_count END), 0) AS denom_course,
    COALESCE(SUM(CASE WHEN response_count > 0 AND avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN response_count END), 0) AS denom_oper,
    COALESCE(SUM(response_count), 0) AS total_responses
  FROM base
),
summary_json AS (
  SELECT jsonb_build_object(
    'educationYear', p_year,
    'courseName', NULLIF(p_course_name, ''),
    'normalizedCourseName', NULLIF(p_course_name, ''),
    'educationRound', p_round,
    'instructorId', p_instructor_id::text,
    'availableRounds', COALESCE((
      SELECT jsonb_agg(DISTINCT education_round ORDER BY education_round)
      FROM base
    ), '[]'::jsonb),
    'totalSurveys', (SELECT COUNT(*) FROM base),
    'totalResponses', (SELECT total_responses FROM summary_calc),
    'avgInstructorSatisfaction', CASE WHEN (SELECT denom_instr FROM summary_calc) > 0
       THEN ROUND((SELECT sum_instr FROM summary_calc) / (SELECT denom_instr FROM summary_calc), 2) ELSE NULL END,
    'avgCourseSatisfaction', CASE WHEN (SELECT denom_course FROM summary_calc) > 0
       THEN ROUND((SELECT sum_course FROM summary_calc) / (SELECT denom_course FROM summary_calc), 2) ELSE NULL END,
    'avgOperationSatisfaction', CASE WHEN (SELECT denom_oper FROM summary_calc) > 0
       THEN ROUND((SELECT sum_oper FROM summary_calc) / (SELECT denom_oper FROM summary_calc), 2) ELSE NULL END,
    -- Count only instructors with actual responses
    'instructorCount', (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT instructor_id
        FROM base
        WHERE instructor_id IS NOT NULL AND response_count > 0
      ) i
    )
  ) AS summary
),
trend_json AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'educationRound', t.education_round,
        'avgInstructorSatisfaction', CASE WHEN t.denom_instr > 0 THEN ROUND(t.sum_instr / t.denom_instr, 2) ELSE NULL END,
        'avgCourseSatisfaction', CASE WHEN t.denom_course > 0 THEN ROUND(t.sum_course / t.denom_course, 2) ELSE NULL END,
        'avgOperationSatisfaction', CASE WHEN t.denom_oper > 0 THEN ROUND(t.sum_oper / t.denom_oper, 2) ELSE NULL END,
        'responseCount', t.total_responses
      ) ORDER BY t.education_round
    ), '[]'::jsonb
  ) AS trend
  FROM (
    SELECT
      education_round,
      SUM(response_count) AS total_responses,
      -- Weighted sums and denominators only where avg > 0
      SUM(CASE WHEN avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN avg_instructor_satisfaction * response_count END) AS sum_instr,
      SUM(CASE WHEN avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN avg_course_satisfaction * response_count END) AS sum_course,
      SUM(CASE WHEN avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN avg_operation_satisfaction * response_count END) AS sum_oper,
      SUM(CASE WHEN avg_instructor_satisfaction IS NOT NULL AND avg_instructor_satisfaction > 0 THEN response_count END) AS denom_instr,
      SUM(CASE WHEN avg_course_satisfaction IS NOT NULL AND avg_course_satisfaction > 0 THEN response_count END) AS denom_course,
      SUM(CASE WHEN avg_operation_satisfaction IS NOT NULL AND avg_operation_satisfaction > 0 THEN response_count END) AS denom_oper
    FROM base
    GROUP BY education_round
    ORDER BY education_round
  ) t
),
instructor_stats_json AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'instructorId', i.instructor_id::text,
        'instructorName', i.instructor_name,
        'surveyCount', i.survey_count,
        'responseCount', i.responses,
        'avgSatisfaction', CASE WHEN i.denom_overall > 0 THEN ROUND(i.sum_overall / i.denom_overall, 2) ELSE NULL END
      ) ORDER BY i.instructor_name NULLS LAST
    ), '[]'::jsonb
  ) AS instructor_stats
  FROM (
    SELECT
      instructor_id,
      MAX(instructor_name) AS instructor_name,
      COUNT(*) AS survey_count,
      SUM(response_count) AS responses,
      SUM(CASE WHEN avg_overall_satisfaction IS NOT NULL AND avg_overall_satisfaction > 0 THEN avg_overall_satisfaction * response_count END) AS sum_overall,
      SUM(CASE WHEN avg_overall_satisfaction IS NOT NULL AND avg_overall_satisfaction > 0 THEN response_count END) AS denom_overall
    FROM base
    WHERE instructor_id IS NOT NULL
    GROUP BY instructor_id
  ) i
),
available_courses_json AS (
  WITH base_year AS (
    SELECT *
    FROM public.survey_aggregates
    WHERE education_year = p_year
      AND (p_include_test IS TRUE OR COALESCE(is_test, false) = false)
      AND (p_instructor_id IS NULL OR instructor_id = p_instructor_id)
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'normalizedName', c.course_name,
        'displayName', c.course_name,
        'rounds', c.rounds
      ) ORDER BY c.course_name
    ), '[]'::jsonb
  ) AS available_courses
  FROM (
    SELECT
      course_name,
      (SELECT jsonb_agg(DISTINCT education_round ORDER BY education_round) FROM base_year by2 WHERE by2.course_name = by.course_name) AS rounds
    FROM base_year by
    WHERE course_name IS NOT NULL
    GROUP BY course_name
  ) c
),
available_instructors_json AS (
  WITH base_year AS (
    SELECT *
    FROM public.survey_aggregates
    WHERE education_year = p_year
      AND (p_include_test IS TRUE OR COALESCE(is_test, false) = false)
      AND (p_course_name IS NULL OR course_name = p_course_name)
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', instructor_id::text,
        'name', instructor_name
      ) ORDER BY instructor_name NULLS LAST
    ), '[]'::jsonb
  ) AS available_instructors
  FROM (
    SELECT DISTINCT instructor_id, instructor_name
    FROM base_year
    WHERE instructor_id IS NOT NULL
  ) x
)
SELECT
  (SELECT summary FROM summary_json)::json,
  (SELECT trend FROM trend_json)::json,
  (SELECT instructor_stats FROM instructor_stats_json)::json,
  '[]'::json AS textual_responses,
  (SELECT available_courses FROM available_courses_json)::json,
  (SELECT available_instructors FROM available_instructors_json)::json;
$function$;