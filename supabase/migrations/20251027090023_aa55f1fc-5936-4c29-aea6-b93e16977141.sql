-- Fix instructor count to include survey_sessions table
DROP FUNCTION IF EXISTS public.rpc_dashboard_counts(integer, uuid);

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
-- Count unique instructors from surveys.instructor_id, survey_instructors, AND survey_sessions
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
    WHERE si.instructor_id IS NOT NULL
    UNION
    SELECT ses.instructor_id
    FROM public.survey_sessions ses
    JOIN scoped_surveys ss ON ss.survey_id = ses.survey_id
    WHERE ses.instructor_id IS NOT NULL
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