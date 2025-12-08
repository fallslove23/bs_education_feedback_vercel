-- Update rpc_dashboard_counts to exclude non-instructor satisfaction instructors
CREATE OR REPLACE FUNCTION public.rpc_dashboard_counts(
  p_year integer DEFAULT NULL,
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE(
  survey_count integer,
  respondent_count integer,
  instructor_count integer,
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
-- Instructors with at least one instructor-type satisfaction response
instr_ids AS (
  SELECT DISTINCT inst_id AS instructor_id
  FROM (
    SELECT COALESCE(s.instructor_id, ses.instructor_id, si.instructor_id) AS inst_id, r.id AS response_id
    FROM scoped_surveys ss
    JOIN public.surveys s ON s.id = ss.survey_id
    LEFT JOIN public.survey_sessions ses ON ses.survey_id = s.id
    LEFT JOIN public.survey_instructors si ON si.survey_id = s.id
    JOIN public.survey_responses r ON r.survey_id = s.id
    JOIN public.question_answers qa ON qa.response_id = r.id
    JOIN public.survey_questions q ON q.id = qa.question_id
    WHERE q.question_type IN ('rating','scale')
      AND q.satisfaction_type = 'instructor'
      AND COALESCE(s.instructor_id, ses.instructor_id, si.instructor_id) IS NOT NULL
  ) z
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
  (SELECT COUNT(DISTINCT instructor_id) FROM instr_ids) AS instructor_count,
  (SELECT a FROM score)                              AS avg_score;
$$;