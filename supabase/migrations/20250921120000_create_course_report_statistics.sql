-- Create helper function to normalize course names similarly to the client logic
CREATE OR REPLACE FUNCTION public.normalize_course_name(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_name text := COALESCE(p_name, '');
BEGIN
  -- Remove "(홀수조)" / "(짝수조)"
  v_name := REGEXP_REPLACE(v_name, '\\((?:홀수조|짝수조)\\)', '', 'gi');
  -- Remove patterns like "11/12조"
  v_name := REGEXP_REPLACE(v_name, '\\b\\d{1,2}/\\d{1,2}조\\b', '', 'gi');
  -- Remove trailing 조 표기 that follows 차수-일차 descriptions
  v_name := REGEXP_REPLACE(v_name, '(\\d+차-\\d+일차)\\s+\\d{1,2}조', '\\1', 'gi');
  v_name := REGEXP_REPLACE(v_name, '(\\d+차-\\d+일차)\\s+(?:홀수조|짝수조)', '\\1', 'gi');
  -- Remove standalone 조/반 suffixes
  v_name := REGEXP_REPLACE(v_name, '\\b\\d{1,2}\\s*(?:조|반)\\b', '', 'gi');
  -- Remove prefixes like "홀수조-" / "짝수조-"
  v_name := REGEXP_REPLACE(v_name, '(?:홀수조|짝수조)-', '', 'gi');
  -- Clean up extra spaces and hyphens
  v_name := REGEXP_REPLACE(v_name, '\\s{2,}', ' ', 'g');
  v_name := REGEXP_REPLACE(v_name, '-{2,}', '-', 'g');
  RETURN TRIM(v_name);
END;
$$;

-- Stored procedure that aggregates course report statistics
CREATE OR REPLACE FUNCTION public.course_report_statistics(
  p_year integer,
  p_course_name text DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  target_course text;
BEGIN
  WITH base_surveys AS (
    SELECT
      s.*,
      public.normalize_course_name(s.course_name) AS normalized_course_name
    FROM public.surveys s
    WHERE s.education_year = p_year
      AND s.status IN ('completed', 'active')
      AND (p_include_test OR COALESCE(s.is_test, false) = false)
  ),
  initial_course AS (
    SELECT MIN(normalized_course_name) AS normalized_course_name
    FROM base_surveys
  )
  SELECT ic.normalized_course_name INTO target_course
  FROM initial_course ic;

  IF p_course_name IS NOT NULL AND LENGTH(TRIM(p_course_name)) > 0 THEN
    target_course := public.normalize_course_name(p_course_name);
  END IF;

  WITH base_surveys AS (
    SELECT
      s.*,
      public.normalize_course_name(s.course_name) AS normalized_course_name
    FROM public.surveys s
    WHERE s.education_year = p_year
      AND s.status IN ('completed', 'active')
      AND (p_include_test OR COALESCE(s.is_test, false) = false)
  ),
  base_instructor_links AS (
    SELECT s.id AS survey_id, s.instructor_id
    FROM base_surveys s
    WHERE s.instructor_id IS NOT NULL
    UNION
    SELECT si.survey_id, si.instructor_id
    FROM public.survey_instructors si
    JOIN base_surveys s ON s.id = si.survey_id
    WHERE si.instructor_id IS NOT NULL
    UNION
    SELECT ss.survey_id, ss.instructor_id
    FROM public.survey_sessions ss
    JOIN base_surveys s ON s.id = ss.survey_id
    WHERE ss.instructor_id IS NOT NULL
  ),
  filtered_surveys AS (
    SELECT bs.*
    FROM base_surveys bs
    WHERE (target_course IS NULL OR bs.normalized_course_name = target_course)
      AND (p_round IS NULL OR bs.education_round = p_round)
      AND (
        p_instructor_id IS NULL OR EXISTS (
          SELECT 1
          FROM base_instructor_links bil
          WHERE bil.survey_id = bs.id
            AND bil.instructor_id = p_instructor_id
        )
      )
  ),
  filtered_instructor_links AS (
    SELECT DISTINCT bil.survey_id, bil.instructor_id
    FROM base_instructor_links bil
    JOIN filtered_surveys fs ON fs.id = bil.survey_id
  ),
  instructor_info AS (
    SELECT
      fil.survey_id,
      fil.instructor_id,
      COALESCE(i.name, '강사 정보 없음') AS instructor_name
    FROM filtered_instructor_links fil
    LEFT JOIN public.instructors i ON i.id = fil.instructor_id
  ),
  survey_instructor_counts AS (
    SELECT survey_id, COUNT(DISTINCT instructor_id) AS instructor_count
    FROM filtered_instructor_links
    GROUP BY survey_id
  ),
  single_instructor_map AS (
    SELECT sic.survey_id, MIN(fil.instructor_id) AS instructor_id
    FROM survey_instructor_counts sic
    JOIN filtered_instructor_links fil ON fil.survey_id = sic.survey_id
    WHERE sic.instructor_count = 1
    GROUP BY sic.survey_id
  ),
  session_instructor_map AS (
    SELECT ss.id AS session_id, ss.survey_id, ss.instructor_id
    FROM public.survey_sessions ss
    JOIN filtered_surveys fs ON fs.id = ss.survey_id
    WHERE ss.instructor_id IS NOT NULL
  ),
  responses AS (
    SELECT sr.*
    FROM public.survey_responses sr
    JOIN filtered_surveys fs ON fs.id = sr.survey_id
    WHERE p_include_test OR COALESCE(sr.is_test, false) = false
  ),
  answers AS (
    SELECT
      qa.id,
      qa.response_id,
      qa.answer_value,
      qa.answer_text,
      qa.created_at,
      sq.question_type,
      sq.satisfaction_type,
      sq.session_id,
      r.survey_id
    FROM public.question_answers qa
    JOIN responses r ON r.id = qa.response_id
    JOIN public.survey_questions sq ON sq.id = qa.question_id
  ),
  numeric_answers AS (
    SELECT
      a.*,
      NULLIF(trim(both '"' FROM COALESCE(a.answer_text, a.answer_value::text)), '') AS answer_string
    FROM answers a
  ),
  scored_answers AS (
    SELECT
      na.survey_id,
      na.response_id,
      na.question_type,
      na.satisfaction_type,
      na.session_id,
      CASE
        WHEN na.question_type IN ('scale', 'rating')
             AND na.answer_string ~ '^[0-9]+(\\.[0-9]+)?$'
        THEN CASE
          WHEN (na.answer_string)::numeric <= 0 THEN NULL
          WHEN (na.answer_string)::numeric <= 5 THEN (na.answer_string)::numeric * 2
          ELSE (na.answer_string)::numeric
        END
        ELSE NULL
      END AS score
    FROM numeric_answers na
  ),
  scored_with_instructors AS (
    SELECT
      sa.*,
      COALESCE(sim.instructor_id, sim2.instructor_id) AS target_instructor_id
    FROM scored_answers sa
    LEFT JOIN session_instructor_map sim ON sim.session_id = sa.session_id
    LEFT JOIN single_instructor_map sim2 ON sim2.survey_id = sa.survey_id
  ),
  available_courses_pre AS (
    SELECT
      bs.normalized_course_name,
      MIN(bs.course_name) AS display_name,
      ARRAY_AGG(DISTINCT bs.education_round ORDER BY bs.education_round) AS rounds
    FROM base_surveys bs
    GROUP BY bs.normalized_course_name
  ),
  available_courses_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'normalizedName', ac.normalized_course_name,
        'displayName', ac.display_name,
        'rounds', to_jsonb(COALESCE(ac.rounds, ARRAY[]::integer[]))
      )
      ORDER BY ac.display_name
    ), '[]'::jsonb) AS data
    FROM available_courses_pre ac
  ),
  available_instructors_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', fi.instructor_id,
        'name', COALESCE(i.name, '강사 정보 없음')
      )
      ORDER BY COALESCE(i.name, '강사 정보 없음')
    ), '[]'::jsonb) AS data
    FROM (
      SELECT DISTINCT instructor_id
      FROM filtered_instructor_links
    ) fi
    LEFT JOIN public.instructors i ON i.id = fi.instructor_id
  ),
  trend_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'educationRound', td.education_round,
        'avgInstructorSatisfaction', td.avg_instructor,
        'avgCourseSatisfaction', td.avg_course,
        'avgOperationSatisfaction', td.avg_operation,
        'responseCount', td.response_count
      )
      ORDER BY td.education_round
    ), '[]'::jsonb) AS data
    FROM (
      SELECT
        fs.education_round,
        AVG(CASE
          WHEN swi.satisfaction_type = 'instructor'
               AND (p_instructor_id IS NULL OR swi.target_instructor_id = p_instructor_id)
          THEN swi.score
        END) AS avg_instructor,
        AVG(CASE WHEN swi.satisfaction_type = 'course' THEN swi.score END) AS avg_course,
        AVG(CASE WHEN swi.satisfaction_type = 'operation' THEN swi.score END) AS avg_operation,
        COUNT(DISTINCT r.id) AS response_count
      FROM filtered_surveys fs
      LEFT JOIN responses r ON r.survey_id = fs.id
      LEFT JOIN scored_with_instructors swi ON swi.response_id = r.id
      GROUP BY fs.education_round
    ) td
  ),
  instructor_stats_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'instructorId', ist.instructor_id,
        'instructorName', ist.instructor_name,
        'surveyCount', ist.survey_count,
        'responseCount', ist.response_count,
        'avgSatisfaction', ist.avg_satisfaction
      )
      ORDER BY ist.avg_satisfaction DESC NULLS LAST
    ), '[]'::jsonb) AS data
    FROM (
      SELECT
        fil.instructor_id,
        COALESCE(MAX(ii.instructor_name), '강사 정보 없음') AS instructor_name,
        COUNT(DISTINCT fs.id) AS survey_count,
        COUNT(DISTINCT CASE WHEN swi.target_instructor_id = fil.instructor_id THEN swi.response_id END) AS response_count,
        AVG(CASE WHEN swi.target_instructor_id = fil.instructor_id THEN swi.score END) AS avg_satisfaction
      FROM filtered_instructor_links fil
      JOIN filtered_surveys fs ON fs.id = fil.survey_id
      LEFT JOIN instructor_info ii ON ii.survey_id = fil.survey_id AND ii.instructor_id = fil.instructor_id
      LEFT JOIN responses r ON r.survey_id = fs.id
      LEFT JOIN scored_with_instructors swi ON swi.response_id = r.id
      GROUP BY fil.instructor_id
    ) ist
  ),
  textual_json AS (
    SELECT COALESCE(jsonb_agg(ta.text_value ORDER BY ta.text_value), '[]'::jsonb) AS data
    FROM (
      SELECT DISTINCT NULLIF(trim(both '"' FROM COALESCE(a.answer_text, a.answer_value::text)), '') AS text_value
      FROM answers a
      WHERE a.question_type IN ('text', 'textarea', 'long_text', 'long_textarea', 'paragraph', 'long_answer')
        AND NULLIF(trim(both '"' FROM COALESCE(a.answer_text, a.answer_value::text)), '') IS NOT NULL
    ) ta
  ),
  summary_values AS (
    SELECT
      COALESCE((SELECT COUNT(DISTINCT fs.id) FROM filtered_surveys fs), 0) AS total_surveys,
      COALESCE((SELECT COUNT(DISTINCT r.id) FROM responses r), 0) AS total_responses,
      (SELECT AVG(swi.score)
       FROM scored_with_instructors swi
       WHERE swi.satisfaction_type = 'instructor'
         AND (p_instructor_id IS NULL OR swi.target_instructor_id = p_instructor_id)) AS avg_instructor,
      (SELECT AVG(swi.score)
       FROM scored_with_instructors swi
       WHERE swi.satisfaction_type = 'course') AS avg_course,
      (SELECT AVG(swi.score)
       FROM scored_with_instructors swi
       WHERE swi.satisfaction_type = 'operation') AS avg_operation,
      COALESCE((SELECT COUNT(DISTINCT instructor_id) FROM filtered_instructor_links), 0) AS instructor_count,
      (SELECT MIN(fs.course_name) FROM filtered_surveys fs) AS course_name,
      (SELECT MIN(fs.normalized_course_name) FROM filtered_surveys fs) AS normalized_course_name,
      COALESCE((SELECT ARRAY_AGG(DISTINCT fs.education_round ORDER BY fs.education_round)
                FROM filtered_surveys fs), ARRAY[]::integer[]) AS available_rounds
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'educationYear', p_year,
      'courseName', sv.course_name,
      'normalizedCourseName', sv.normalized_course_name,
      'educationRound', p_round,
      'instructorId', p_instructor_id,
      'availableRounds', to_jsonb(sv.available_rounds),
      'totalSurveys', sv.total_surveys,
      'totalResponses', sv.total_responses,
      'avgInstructorSatisfaction', sv.avg_instructor,
      'avgCourseSatisfaction', sv.avg_course,
      'avgOperationSatisfaction', sv.avg_operation,
      'instructorCount', sv.instructor_count
    ),
    'trend', tj.data,
    'instructorStats', isj.data,
    'textualResponses', txj.data,
    'availableCourses', acj.data,
    'availableInstructors', aij.data
  )
  INTO result
  FROM summary_values sv
  CROSS JOIN trend_json tj
  CROSS JOIN instructor_stats_json isj
  CROSS JOIN textual_json txj
  CROSS JOIN available_courses_json acj
  CROSS JOIN available_instructors_json aij;

  RETURN COALESCE(result, jsonb_build_object(
    'summary', jsonb_build_object(
      'educationYear', p_year,
      'courseName', NULL,
      'normalizedCourseName', NULL,
      'educationRound', p_round,
      'instructorId', p_instructor_id,
      'availableRounds', to_jsonb(ARRAY[]::integer[]),
      'totalSurveys', 0,
      'totalResponses', 0,
      'avgInstructorSatisfaction', NULL,
      'avgCourseSatisfaction', NULL,
      'avgOperationSatisfaction', NULL,
      'instructorCount', 0
    ),
    'trend', '[]'::jsonb,
    'instructorStats', '[]'::jsonb,
    'textualResponses', '[]'::jsonb,
    'availableCourses', '[]'::jsonb,
    'availableInstructors', '[]'::jsonb
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.course_report_statistics(integer, text, integer, uuid, boolean) TO anon, authenticated;

COMMENT ON FUNCTION public.course_report_statistics IS 'Returns aggregated course report metrics (responses, satisfaction scores, instructor stats, trend, text responses) for a given set of filters.';
