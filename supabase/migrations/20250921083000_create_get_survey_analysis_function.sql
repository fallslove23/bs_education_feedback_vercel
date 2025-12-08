-- Create RPC to return aggregated survey summaries and question type distributions
CREATE OR REPLACE FUNCTION public.get_survey_analysis(
  p_year integer DEFAULT NULL,
  p_round integer DEFAULT NULL,
  p_course_name text DEFAULT NULL,
  p_instructor_id uuid DEFAULT NULL,
  p_include_test boolean DEFAULT false
)
RETURNS TABLE (
  survey_id uuid,
  title text,
  description text,
  education_year integer,
  education_round integer,
  course_name text,
  status text,
  instructor_id uuid,
  instructor_name text,
  expected_participants integer,
  is_test boolean,
  response_count bigint,
  last_response_at timestamptz,
  avg_overall_satisfaction numeric,
  avg_course_satisfaction numeric,
  avg_instructor_satisfaction numeric,
  avg_operation_satisfaction numeric,
  question_count bigint,
  question_type_distribution jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT
      sa.survey_id,
      sa.title,
      s.description,
      sa.education_year,
      sa.education_round,
      sa.course_name,
      sa.status,
      sa.instructor_id,
      sa.instructor_name,
      sa.expected_participants,
      sa.is_test,
      CASE
        WHEN p_include_test THEN sa.response_count
        ELSE COALESCE(sa.response_count_real, 0)
      END AS response_count,
      CASE
        WHEN p_include_test THEN sa.last_response_at
        ELSE sa.last_response_at_real
      END AS last_response_at,
      CASE
        WHEN p_include_test THEN sa.avg_overall_satisfaction
        ELSE sa.avg_overall_satisfaction_real
      END AS avg_overall_satisfaction,
      CASE
        WHEN p_include_test THEN sa.avg_course_satisfaction
        ELSE sa.avg_course_satisfaction_real
      END AS avg_course_satisfaction,
      CASE
        WHEN p_include_test THEN sa.avg_instructor_satisfaction
        ELSE sa.avg_instructor_satisfaction_real
      END AS avg_instructor_satisfaction,
      CASE
        WHEN p_include_test THEN sa.avg_operation_satisfaction
        ELSE sa.avg_operation_satisfaction_real
      END AS avg_operation_satisfaction
    FROM public.survey_aggregates sa
    JOIN public.surveys s ON s.id = sa.survey_id
    WHERE (p_year IS NULL OR sa.education_year = p_year)
      AND (p_round IS NULL OR sa.education_round = p_round)
      AND (p_course_name IS NULL OR sa.course_name = p_course_name)
      AND (p_instructor_id IS NULL OR sa.instructor_id = p_instructor_id)
      AND (p_include_test OR COALESCE(sa.is_test, false) = false)
  ),
  question_counts AS (
    SELECT
      sq.survey_id,
      COUNT(DISTINCT sq.id) AS question_count
    FROM public.survey_questions sq
    JOIN filtered f ON f.survey_id = sq.survey_id
    GROUP BY sq.survey_id
  ),
  distributions AS (
    SELECT
      sq.survey_id,
      jsonb_agg(
        jsonb_build_object(
          'question_type', sq.question_type,
          'response_count', COUNT(qa.id) FILTER (
            WHERE p_include_test
              OR COALESCE(sr.is_test, false) = false
          )
        ) ORDER BY sq.question_type
      ) AS question_type_distribution
    FROM public.survey_questions sq
    LEFT JOIN public.question_answers qa ON qa.question_id = sq.id
    LEFT JOIN public.survey_responses sr ON sr.id = qa.response_id
    JOIN filtered f ON f.survey_id = sq.survey_id
    GROUP BY sq.survey_id
  )
  SELECT
    f.survey_id,
    f.title,
    f.description,
    f.education_year,
    f.education_round,
    f.course_name,
    f.status,
    f.instructor_id,
    f.instructor_name,
    f.expected_participants,
    f.is_test,
    f.response_count,
    f.last_response_at,
    f.avg_overall_satisfaction,
    f.avg_course_satisfaction,
    f.avg_instructor_satisfaction,
    f.avg_operation_satisfaction,
    COALESCE(qc.question_count, 0) AS question_count,
    COALESCE(d.question_type_distribution, '[]'::jsonb) AS question_type_distribution
  FROM filtered f
  LEFT JOIN question_counts qc ON qc.survey_id = f.survey_id
  LEFT JOIN distributions d ON d.survey_id = f.survey_id
  ORDER BY f.education_year DESC, f.education_round DESC, f.course_name NULLS LAST, f.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_analysis(
  integer,
  integer,
  text,
  uuid,
  boolean
) TO authenticated, anon;

COMMENT ON FUNCTION public.get_survey_analysis(integer, integer, text, uuid, boolean)
IS 'Returns aggregated survey metrics with question type distributions filtered by year, round, course, instructor, and optional test data inclusion.';
