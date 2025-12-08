-- Drop and recreate rpc_dashboard_counts with correct column references
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
WITH scoped_responses AS (
  SELECT r.id, r.survey_id, r.session_id
  FROM public.survey_responses r
  JOIN public.surveys s ON s.id = r.survey_id
  WHERE (p_session_id IS NULL OR r.session_id = p_session_id)
    AND (p_year IS NULL OR s.education_year = p_year)
),
base AS (
  SELECT COUNT(DISTINCT survey_id) AS survey_cnt
  FROM scoped_responses
),
resp AS (
  SELECT COUNT(*) AS resp_cnt
  FROM scoped_responses
),
instr AS (
  SELECT COUNT(DISTINCT si.instructor_id) AS c
  FROM public.survey_instructors si
  JOIN scoped_responses r ON r.survey_id = si.survey_id
),
score_rows AS (
  SELECT (qa.answer_value)::numeric AS score
  FROM public.question_answers qa
  JOIN scoped_responses r ON r.id = qa.response_id
  JOIN public.survey_questions q ON q.id = qa.question_id
  WHERE qa.answer_value IS NOT NULL
    AND pg_typeof(qa.answer_value) = 'numeric'::regtype
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_counts(integer, uuid) TO anon, authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';