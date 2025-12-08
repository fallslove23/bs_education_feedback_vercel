-- Create or replace the survey cumulative statistics view with precomputed
-- response counts, satisfaction averages (converted to a 10-point scale), and
-- instructor aggregations so the application can query a single dataset.
DROP INDEX IF EXISTS public.idx_survey_cumulative_stats_survey_id;
DROP INDEX IF EXISTS public.idx_survey_cumulative_stats_education_year;
DROP INDEX IF EXISTS public.idx_survey_cumulative_stats_course_name;
DROP INDEX IF EXISTS public.idx_survey_cumulative_stats_test;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'survey_cumulative_stats'
  ) THEN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Admins and operators can view cumulative stats" ON public.survey_cumulative_stats';
    EXCEPTION
      WHEN undefined_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Instructors can view their own survey stats" ON public.survey_cumulative_stats';
    EXCEPTION
      WHEN undefined_object THEN NULL;
    END;
  END IF;
END
$$;

DROP MATERIALIZED VIEW IF EXISTS public.survey_cumulative_stats CASCADE;
DROP VIEW IF EXISTS public.survey_cumulative_stats;
DROP FUNCTION IF EXISTS public.get_survey_cumulative_summary(text, integer, text, boolean);

CREATE VIEW public.survey_cumulative_stats AS
WITH instructor_union AS (
  SELECT s.id AS survey_id, i.name AS instructor_name
  FROM public.surveys s
  LEFT JOIN public.instructors i ON i.id = s.instructor_id
  WHERE i.name IS NOT NULL

  UNION

  SELECT ss.survey_id, i2.name AS instructor_name
  FROM public.survey_sessions ss
  LEFT JOIN public.instructors i2 ON i2.id = ss.instructor_id
  WHERE i2.name IS NOT NULL
),
instructor_agg AS (
  SELECT
    survey_id,
    ARRAY_AGG(DISTINCT instructor_name) AS instructor_names,
    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT instructor_name), ', ') AS instructor_names_text,
    COUNT(DISTINCT instructor_name) AS instructor_count
  FROM instructor_union
  GROUP BY survey_id
),
score_data AS (
  SELECT
    s.id AS survey_id,
    sr.id AS response_id,
    COALESCE(sr.is_test, false) AS is_test_response,
    sq.satisfaction_type,
    CASE
      WHEN sq.question_type IN ('scale', 'rating') THEN CASE
        WHEN safe_answer.safe_score IS NULL THEN NULL
        WHEN safe_answer.safe_score <= 5 THEN safe_answer.safe_score * 2
        ELSE safe_answer.safe_score
      END
      ELSE NULL
    END AS satisfaction_score
  FROM public.surveys s
  LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
  LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
  LEFT JOIN public.survey_questions sq ON sq.id = qa.question_id
  LEFT JOIN LATERAL (
    SELECT public.safe_numeric_convert(
      COALESCE(
        NULLIF(qa.answer_value::text, ''),
        NULLIF(qa.answer_text, '')
      )
    ) AS safe_score
  ) AS safe_answer ON TRUE
)
SELECT
  s.id AS survey_id,
  s.title,
  s.education_year,
  s.education_round,
  s.course_name,
  s.status,
  s.expected_participants,
  s.created_at,
  s.is_test AS survey_is_test,
  COALESCE(ia.instructor_names, ARRAY[]::text[]) AS instructor_names,
  COALESCE(ia.instructor_names_text, '') AS instructor_names_text,
  COALESCE(ia.instructor_count, 0) AS instructor_count,
  COUNT(DISTINCT sr.id) AS total_response_count,
  COUNT(DISTINCT CASE WHEN sd.is_test_response = false THEN sr.id END) AS real_response_count,
  COUNT(DISTINCT CASE WHEN sd.is_test_response = true THEN sr.id END) AS test_response_count,
  MAX(sr.submitted_at) AS last_response_at,
  AVG(sd.satisfaction_score) AS avg_satisfaction_total,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.is_test_response = false) AS avg_satisfaction_real,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.is_test_response = true) AS avg_satisfaction_test,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'course') AS avg_course_satisfaction_total,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'course' AND sd.is_test_response = false) AS avg_course_satisfaction_real,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'course' AND sd.is_test_response = true) AS avg_course_satisfaction_test,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'instructor') AS avg_instructor_satisfaction_total,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'instructor' AND sd.is_test_response = false) AS avg_instructor_satisfaction_real,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'instructor' AND sd.is_test_response = true) AS avg_instructor_satisfaction_test,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'operation') AS avg_operation_satisfaction_total,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'operation' AND sd.is_test_response = false) AS avg_operation_satisfaction_real,
  AVG(sd.satisfaction_score) FILTER (WHERE sd.satisfaction_type = 'operation' AND sd.is_test_response = true) AS avg_operation_satisfaction_test,
  COALESCE(COUNT(DISTINCT sr.id)::numeric * COALESCE(AVG(sd.satisfaction_score), 0), 0) AS weighted_satisfaction_total,
  COALESCE(
    COUNT(DISTINCT CASE WHEN sd.is_test_response = false THEN sr.id END)::numeric
      * COALESCE(AVG(sd.satisfaction_score) FILTER (WHERE sd.is_test_response = false), 0),
    0
  ) AS weighted_satisfaction_real,
  COALESCE(
    COUNT(DISTINCT CASE WHEN sd.is_test_response = true THEN sr.id END)::numeric
      * COALESCE(AVG(sd.satisfaction_score) FILTER (WHERE sd.is_test_response = true), 0),
    0
  ) AS weighted_satisfaction_test
FROM public.surveys s
LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
LEFT JOIN score_data sd ON sd.response_id = sr.id
LEFT JOIN instructor_agg ia ON ia.survey_id = s.id
WHERE s.status IN ('completed', 'active')
GROUP BY
  s.id,
  s.title,
  s.education_year,
  s.education_round,
  s.course_name,
  s.status,
  s.expected_participants,
  s.created_at,
  s.is_test,
  ia.instructor_names,
  ia.instructor_names_text,
  ia.instructor_count;

COMMENT ON VIEW public.survey_cumulative_stats IS
  'Aggregated survey-level response counts, satisfaction averages, and instructor metadata for cumulative dashboards.';

GRANT SELECT ON public.survey_cumulative_stats TO authenticated;
GRANT SELECT ON public.survey_cumulative_stats TO anon;

CREATE OR REPLACE FUNCTION public.get_survey_cumulative_summary(
  search_term text DEFAULT NULL,
  education_year integer DEFAULT NULL,
  course_name text DEFAULT NULL,
  include_test_data boolean DEFAULT false
)
RETURNS TABLE (
  total_surveys bigint,
  total_responses bigint,
  average_satisfaction numeric,
  participating_instructors bigint,
  courses_in_progress bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH filtered AS (
    SELECT
      scs.*,
      CASE
        WHEN include_test_data THEN COALESCE(scs.total_response_count, 0)
        ELSE COALESCE(scs.real_response_count, 0)
      END AS effective_response_count,
      CASE
        WHEN include_test_data THEN COALESCE(scs.weighted_satisfaction_total, 0)
        ELSE COALESCE(scs.weighted_satisfaction_real, 0)
      END AS effective_weighted_satisfaction
    FROM public.survey_cumulative_stats scs
    WHERE
      (education_year IS NULL OR scs.education_year = education_year)
      AND (course_name IS NULL OR scs.course_name = course_name)
      AND (
        include_test_data
        OR COALESCE(scs.survey_is_test, false) = false
      )
      AND (
        search_term IS NULL OR search_term = ''
        OR scs.title ILIKE '%' || search_term || '%'
        OR scs.course_name ILIKE '%' || search_term || '%'
        OR scs.instructor_names_text ILIKE '%' || search_term || '%'
      )
  ),
  instructor_set AS (
    SELECT DISTINCT TRIM(BOTH FROM instructor_name) AS instructor_name
    FROM filtered
    CROSS JOIN LATERAL UNNEST(COALESCE(filtered.instructor_names, ARRAY[]::text[])) AS instructor_name
    WHERE instructor_name IS NOT NULL AND instructor_name <> ''
  )
  SELECT
    COUNT(*)::bigint AS total_surveys,
    COALESCE(SUM(effective_response_count), 0)::bigint AS total_responses,
    CASE
      WHEN COALESCE(SUM(effective_response_count), 0) > 0
        THEN ROUND(SUM(effective_weighted_satisfaction) / NULLIF(SUM(effective_response_count), 0), 1)
      ELSE NULL
    END AS average_satisfaction,
    (SELECT COUNT(*)::bigint FROM instructor_set) AS participating_instructors,
    COUNT(DISTINCT filtered.course_name)::bigint AS courses_in_progress
  FROM filtered;
$$;

COMMENT ON FUNCTION public.get_survey_cumulative_summary(text, integer, text, boolean) IS
  'Returns summary metrics for the survey_cumulative_stats view after applying dashboard filters.';
