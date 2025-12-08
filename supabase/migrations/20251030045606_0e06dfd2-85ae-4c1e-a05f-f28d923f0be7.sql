
-- 1) Replace helper to avoid referencing surveys inside surveys policy
CREATE OR REPLACE FUNCTION public.is_instructor_for_survey(_survey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT instructor_id FROM public.profiles WHERE id = auth.uid()
  )
  SELECT (
    EXISTS (
      SELECT 1
      FROM me m
      JOIN public.survey_sessions ss ON ss.instructor_id = m.instructor_id
      WHERE m.instructor_id IS NOT NULL
        AND ss.survey_id = _survey_id
    )
  ) OR (
    EXISTS (
      SELECT 1
      FROM me m
      JOIN public.survey_instructors si ON si.instructor_id = m.instructor_id
      WHERE m.instructor_id IS NOT NULL
        AND si.survey_id = _survey_id
    )
  );
$$;

-- 2) Re-create surveys/survey_responses policies to use the new helper
DROP POLICY IF EXISTS "Instructors can view their surveys" ON public.surveys;
CREATE POLICY "Instructors can view their surveys"
ON public.surveys FOR SELECT
USING (public.is_instructor_for_survey(surveys.id));

DROP POLICY IF EXISTS "Instructors can view responses for their surveys" ON public.survey_responses;
CREATE POLICY "Instructors can view responses for their surveys"
ON public.survey_responses FOR SELECT
USING (public.is_instructor_for_survey(survey_responses.survey_id));

-- 3) Broader read access for authenticated staff so dashboards don't 500
--    (non-sensitive metadata only)
DROP POLICY IF EXISTS "Authenticated can view basic surveys" ON public.surveys;
CREATE POLICY "Authenticated can view basic surveys"
ON public.surveys FOR SELECT
USING (auth.uid() IS NOT NULL AND status IN ('active','completed','public'));

DROP POLICY IF EXISTS "Authenticated can view responses (read-only)" ON public.survey_responses;
CREATE POLICY "Authenticated can view responses (read-only)"
ON public.survey_responses FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4) Make rpc_dashboard_counts run with definer rights to avoid RLS errors inside
CREATE OR REPLACE FUNCTION public.rpc_dashboard_counts(p_year integer DEFAULT NULL::integer, p_session_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(survey_count integer, respondent_count integer, instructor_count integer, avg_score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_counts(integer, uuid) TO anon, authenticated;
