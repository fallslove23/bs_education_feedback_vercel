-- Create a view that exposes aggregated survey metrics so the application can avoid
-- calculating heavy statistics in the client.
DROP VIEW IF EXISTS public.survey_aggregates;

CREATE VIEW public.survey_aggregates AS
SELECT
  s.id AS survey_id,
  s.title,
  s.education_year,
  s.education_round,
  s.course_name,
  s.status,
  s.instructor_id,
  i.name AS instructor_name,
  s.expected_participants,
  s.is_test,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM public.survey_questions sq_all
      WHERE sq_all.survey_id = s.id
    ),
    0
  ) AS question_count,
  COUNT(DISTINCT sr.id) AS response_count,
  COUNT(DISTINCT sr.id) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS response_count_real,
  MAX(sr.submitted_at) AS last_response_at,
  MAX(sr.submitted_at) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS last_response_at_real,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) AS avg_overall_satisfaction,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS avg_overall_satisfaction_real,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'course'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) AS avg_course_satisfaction,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'course'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS avg_course_satisfaction_real,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'instructor'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) AS avg_instructor_satisfaction,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'instructor'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS avg_instructor_satisfaction_real,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'operation'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) AS avg_operation_satisfaction,
  AVG(
    CASE
      WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
           AND sq.satisfaction_type = 'operation'
      THEN CASE
        WHEN (qa.answer_value::text)::numeric <= 5
          THEN (qa.answer_value::text)::numeric * 2
        ELSE (qa.answer_value::text)::numeric
      END
      ELSE NULL
    END
  ) FILTER (
    WHERE COALESCE(sr.is_test, false) = false
  ) AS avg_operation_satisfaction_real
FROM public.surveys s
LEFT JOIN public.instructors i ON i.id = s.instructor_id
LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
LEFT JOIN public.survey_questions sq ON sq.id = qa.question_id
WHERE s.status IN ('completed', 'active', 'public')
GROUP BY
  s.id,
  s.title,
  s.education_year,
  s.education_round,
  s.course_name,
  s.status,
  s.instructor_id,
  i.name,
  s.expected_participants,
  s.is_test;

COMMENT ON VIEW public.survey_aggregates IS 'Aggregated survey metrics including response counts and satisfaction averages';
GRANT SELECT ON public.survey_aggregates TO anon, authenticated;

