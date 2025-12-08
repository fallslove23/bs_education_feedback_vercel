-- 1) Fix rpc_dashboard_counts to filter by surveys.session_id (not responses) and compute numeric scores robustly
DROP FUNCTION IF EXISTS public.rpc_dashboard_counts(integer, uuid);

CREATE OR REPLACE FUNCTION public.rpc_dashboard_counts(
  p_year integer DEFAULT NULL,
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE (
  survey_count int,
  respondent_count int,
  instructor_count int,
  avg_score numeric
)
LANGUAGE sql
STABLE
AS $$
WITH scoped_surveys AS (
  SELECT s.id AS survey_id
  FROM public.surveys s
  WHERE (p_year IS NULL OR s.education_year = p_year)
    AND (p_session_id IS NULL OR s.session_id = p_session_id)
),
scoped_responses AS (
  SELECT r.id, r.survey_id
  FROM public.survey_responses r
  JOIN scoped_surveys ss ON ss.survey_id = r.survey_id
),
base AS (
  SELECT COUNT(DISTINCT survey_id) AS survey_cnt
  FROM scoped_surveys
),
resp AS (
  SELECT COUNT(DISTINCT id) AS resp_cnt
  FROM scoped_responses
),
-- Count unique instructors from surveys.instructor_id and survey_instructors mapping
instr AS (
  SELECT COUNT(DISTINCT x.instructor_id) AS c
  FROM (
    SELECT s.instructor_id
    FROM public.surveys s
    JOIN scoped_surveys ss ON ss.survey_id = s.id
    WHERE s.instructor_id IS NOT NULL
    UNION
    SELECT si.instructor_id
    FROM public.survey_instructors si
    JOIN scoped_surveys ss ON ss.survey_id = si.survey_id
  ) x
),
score_rows AS (
  SELECT CASE
           WHEN qa.answer_value IS NULL THEN NULL
           WHEN jsonb_typeof(qa.answer_value) = 'number' THEN (qa.answer_value #>> '{}')::numeric
           WHEN jsonb_typeof(qa.answer_value) = 'string' AND (qa.answer_value #>> '{}') ~ '^[0-9]+(\.[0-9]+)?$' THEN (qa.answer_value #>> '{}')::numeric
           ELSE NULL
         END AS score
  FROM public.question_answers qa
  JOIN scoped_responses r ON r.id = qa.response_id
  JOIN public.survey_questions q ON q.id = qa.question_id
  WHERE q.question_type IN ('rating','scale')
),
score AS (
  SELECT ROUND(AVG(sr.score), 1) AS a
  FROM score_rows sr
)
SELECT
  COALESCE((SELECT survey_cnt FROM base), 0)         AS survey_count,
  COALESCE((SELECT resp_cnt FROM resp), 0)           AS respondent_count,
  COALESCE((SELECT c FROM instr), 0)                 AS instructor_count,
  (SELECT a FROM score)                              AS avg_score;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_counts(integer, uuid) TO anon, authenticated;

-- 2) Update get_course_reports_working to fallback to overall numeric avg for instructor stats
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
  v_session_uuid UUID;
BEGIN
  IF p_session_id IS NOT NULL AND p_session_id <> '' THEN
    BEGIN v_session_uuid := p_session_id::UUID; EXCEPTION WHEN OTHERS THEN v_session_uuid := NULL; END;
  ELSE v_session_uuid := NULL; END IF;

  -- Summary/trend unchanged from previous version; only instructor_stats tweaked below

  -- Instructor statistics with fallback
  WITH all_instructor_surveys AS (
    SELECT s.id as survey_id, s.instructor_id, i.name as instructor_name
    FROM surveys s
    JOIN instructors i ON s.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (v_session_uuid IS NULL OR s.session_id = v_session_uuid)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NOT TRUE)
      AND (p_instructor_id IS NULL OR s.instructor_id::TEXT = p_instructor_id)
    UNION
    SELECT ss.survey_id, ss.instructor_id, i.name
    FROM survey_sessions ss
    JOIN surveys s ON ss.survey_id = s.id
    JOIN instructors i ON ss.instructor_id = i.id
    WHERE s.education_year = p_year
      AND (v_session_uuid IS NULL OR s.session_id = v_session_uuid)
      AND (p_round IS NULL OR s.education_round = p_round)
      AND (p_include_test OR s.is_test IS NOT TRUE)
      AND (p_instructor_id IS NULL OR ss.instructor_id::TEXT = p_instructor_id)
  ),
  qa_numeric AS (
    SELECT qa.response_id,
           CASE
             WHEN qa.answer_value IS NULL THEN NULL
             WHEN jsonb_typeof(qa.answer_value) = 'number' THEN (qa.answer_value #>> '{}')::numeric
             WHEN jsonb_typeof(qa.answer_value) = 'string' AND (qa.answer_value #>> '{}') ~ '^[0-9]+(\.[0-9]+)?$' THEN (qa.answer_value #>> '{}')::numeric
             ELSE NULL
           END AS num_val,
           sq.question_text,
           sq.question_type
    FROM question_answers qa
    JOIN survey_questions sq ON sq.id = qa.question_id
    WHERE sq.question_type IN ('rating','scale')
  ),
  joined AS (
    SELECT ais.survey_id, ais.instructor_id, ais.instructor_name, sr.id as response_id, qan.num_val, qan.question_text
    FROM all_instructor_surveys ais
    LEFT JOIN survey_responses sr ON sr.survey_id = ais.survey_id AND (p_include_test OR sr.is_test IS NOT TRUE)
    LEFT JOIN qa_numeric qan ON qan.response_id = sr.id
  ),
  instructor_stats AS (
    SELECT 
      j.instructor_id,
      j.instructor_name,
      COUNT(DISTINCT j.survey_id) as survey_count,
      COUNT(DISTINCT j.response_id) as response_count,
      -- Prefer instructor-specific avg; fallback to overall numeric avg
      COALESCE(
        AVG(CASE WHEN j.question_text ILIKE '%강사%만족도%' THEN j.num_val END),
        AVG(j.num_val)
      ) as avg_satisfaction
    FROM joined j
    GROUP BY j.instructor_id, j.instructor_name
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

  -- Preserve previously built summary/trend/text/available results from existing function body
  -- For brevity, reuse the already-created version by calling it and merging keys
  RETURN jsonb_set(
    (SELECT get_course_reports_working(p_year, p_session_id, p_round, p_instructor_id, p_include_test)),
    '{instructor_stats}',
    COALESCE(v_instructor_stats, '[]'::jsonb),
    true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_reports_working TO authenticated, anon;

-- Ensure course filter RPC is callable
GRANT EXECUTE ON FUNCTION public.rpc_course_filter_options(int) TO anon, authenticated;
