-- Fix instructor_survey_stats view to prefer programs.name over course_name to ensure consistency
-- This resolves the issue where "Subjects" (stored in course_name in legacy data) are mixed with "Courses" (Programs)
-- and standardizes the aggregation key.

DROP VIEW IF EXISTS public.instructor_survey_stats CASCADE;

CREATE VIEW public.instructor_survey_stats AS
WITH instructor_survey_map AS (
  SELECT DISTINCT ss.instructor_id,
    ss.survey_id,
    s_1.education_year,
    s_1.education_round,
    -- Prefer programs.name if linked, otherwise fall back to course_name
    COALESCE(p.name, s_1.course_name) as course_name,
    s_1.is_test,
    s_1.status
  FROM survey_sessions ss
    JOIN surveys s_1 ON s_1.id = ss.survey_id
    LEFT JOIN programs p ON p.id = s_1.program_id
  WHERE ss.instructor_id IS NOT NULL
), responses AS (
  SELECT ism.instructor_id,
    ism.survey_id,
    ism.education_year,
    ism.education_round,
    ism.course_name,
    ism.is_test AS survey_is_test,
    ism.status,
    sr.id AS response_id,
    COALESCE(sr.is_test, false) AS response_is_test,
    sr.submitted_at
  FROM instructor_survey_map ism
    LEFT JOIN survey_responses sr ON sr.survey_id = ism.survey_id
), answers AS (
  SELECT r.instructor_id,
    r.survey_id,
    r.education_year,
    r.education_round,
    r.course_name,
    r.survey_is_test,
    r.status,
    r.response_id,
    r.response_is_test,
    r.submitted_at,
    qa.answer_value,
    qa.answer_text,
    sq.satisfaction_type,
    sq.question_type,
    sq.question_text
  FROM responses r
    LEFT JOIN question_answers qa ON qa.response_id = r.response_id
    LEFT JOIN survey_questions sq ON sq.id = qa.question_id
), norm AS (
  SELECT a.instructor_id,
    a.survey_id,
    a.education_year,
    a.education_round,
    a.course_name,
    a.survey_is_test,
    a.status,
    a.response_id,
    a.response_is_test,
    a.submitted_at,
    a.answer_value,
    a.answer_text,
    a.satisfaction_type,
    a.question_type,
    a.question_text,
    CASE
      WHEN a.answer_value IS NOT NULL AND jsonb_typeof(a.answer_value) = 'number' THEN (a.answer_value::text)::numeric
      WHEN a.answer_value IS NOT NULL AND jsonb_typeof(a.answer_value) = 'string' THEN 
        CASE 
          WHEN regexp_replace(a.answer_value #>> '{}', '[^0-9\.]', '', 'g') ~ '^\d+\.?\d*$' 
          THEN (regexp_replace(a.answer_value #>> '{}', '[^0-9\.]', '', 'g'))::numeric
          ELSE NULL
        END
      WHEN a.answer_text IS NOT NULL THEN 
        CASE
          WHEN regexp_replace(a.answer_text, '[^0-9\.]', '', 'g') ~ '^\d+\.?\d*$'
          THEN (regexp_replace(a.answer_text, '[^0-9\.]', '', 'g'))::numeric
          ELSE NULL
        END
      ELSE NULL
    END AS num_val
  FROM answers a
), scaled AS (
  SELECT n.instructor_id,
    n.survey_id,
    n.education_year,
    n.education_round,
    n.course_name,
    n.survey_is_test,
    n.status,
    n.response_id,
    n.response_is_test,
    n.submitted_at,
    n.answer_value,
    n.answer_text,
    n.satisfaction_type,
    n.question_type,
    n.question_text,
    n.num_val,
    CASE
      WHEN n.num_val IS NULL THEN NULL
      WHEN n.num_val <= 5 THEN n.num_val * 2
      ELSE n.num_val
    END AS score10
  FROM norm n
), real_rating_counts AS (
  SELECT s.instructor_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.survey_is_test,
    s.status,
    s.score10::integer AS score_key,
    count(*) AS cnt
  FROM scaled s
  WHERE s.response_is_test = false 
    AND s.question_type IN ('scale', 'rating') 
    AND s.score10 IS NOT NULL
  GROUP BY s.instructor_id, s.education_year, s.education_round, s.course_name, 
    s.survey_is_test, s.status, s.score10::integer
), test_rating_counts AS (
  SELECT s.instructor_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.survey_is_test,
    s.status,
    s.score10::integer AS score_key,
    count(*) AS cnt
  FROM scaled s
  WHERE s.response_is_test = true 
    AND s.question_type IN ('scale', 'rating') 
    AND s.score10 IS NOT NULL
  GROUP BY s.instructor_id, s.education_year, s.education_round, s.course_name, 
    s.survey_is_test, s.status, s.score10::integer
), real_question_avgs AS (
  SELECT s.instructor_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.question_text,
    s.question_type,
    s.satisfaction_type,
    avg(s.score10) AS avg_score
  FROM scaled s
  WHERE s.response_is_test = false 
    AND s.question_type IN ('scale', 'rating')
  GROUP BY s.instructor_id, s.education_year, s.education_round, s.course_name, 
    s.question_text, s.question_type, s.satisfaction_type
), test_question_avgs AS (
  SELECT s.instructor_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.question_text,
    s.question_type,
    s.satisfaction_type,
    avg(s.score10) AS avg_score
  FROM scaled s
  WHERE s.response_is_test = true 
    AND s.question_type IN ('scale', 'rating')
  GROUP BY s.instructor_id, s.education_year, s.education_round, s.course_name, 
    s.question_text, s.question_type, s.satisfaction_type
)
SELECT s.instructor_id,
  i.name AS instructor_name,
  s.education_year,
  s.education_round,
  s.course_name,
  array_agg(DISTINCT s.survey_id) AS survey_ids,
  count(DISTINCT CASE WHEN COALESCE(s.survey_is_test, false) = false THEN s.survey_id END) AS survey_count,
  count(DISTINCT CASE WHEN COALESCE(s.survey_is_test, false) = true THEN s.survey_id END) AS test_survey_count,
  count(DISTINCT CASE WHEN COALESCE(s.survey_is_test, false) = false AND s.status = 'active' THEN s.survey_id END) AS active_survey_count,
  count(DISTINCT CASE WHEN COALESCE(s.survey_is_test, false) = true AND s.status = 'active' THEN s.survey_id END) AS test_active_survey_count,
  count(DISTINCT CASE WHEN s.response_is_test = false THEN s.response_id END) AS response_count,
  count(DISTINCT CASE WHEN s.response_is_test = true THEN s.response_id END) AS test_response_count,
  max(s.submitted_at) AS last_response_at,
  bool_or(COALESCE(s.survey_is_test, false)) AS has_test_data,
  bool_and(COALESCE(s.survey_is_test, false)) AS all_test_data,
  avg(CASE WHEN s.response_is_test = false AND s.satisfaction_type IN ('instructor', 'course', 'operation') AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS avg_overall_satisfaction,
  avg(CASE WHEN s.response_is_test = false AND s.satisfaction_type = 'course' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS avg_course_satisfaction,
  avg(CASE WHEN s.response_is_test = false AND s.satisfaction_type = 'instructor' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS avg_instructor_satisfaction,
  avg(CASE WHEN s.response_is_test = false AND s.satisfaction_type = 'operation' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS avg_operation_satisfaction,
  avg(CASE WHEN s.response_is_test = true AND s.satisfaction_type IN ('instructor', 'course', 'operation') AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS test_avg_overall_satisfaction,
  avg(CASE WHEN s.response_is_test = true AND s.satisfaction_type = 'course' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS test_avg_course_satisfaction,
  avg(CASE WHEN s.response_is_test = true AND s.satisfaction_type = 'instructor' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS test_avg_instructor_satisfaction,
  avg(CASE WHEN s.response_is_test = true AND s.satisfaction_type = 'operation' AND s.question_type IN ('scale', 'rating') THEN s.score10 END) AS test_avg_operation_satisfaction,
  (SELECT jsonb_object_agg(rc.score_key::text, rc.cnt) FROM real_rating_counts rc WHERE rc.instructor_id = s.instructor_id AND rc.education_year = s.education_year AND rc.education_round = s.education_round AND rc.course_name = s.course_name) AS rating_distribution,
  (SELECT jsonb_object_agg(tc.score_key::text, tc.cnt) FROM test_rating_counts tc WHERE tc.instructor_id = s.instructor_id AND tc.education_year = s.education_year AND tc.education_round = s.education_round AND tc.course_name = s.course_name) AS test_rating_distribution,
  count(DISTINCT CASE WHEN s.response_is_test = false AND s.question_type IN ('text', 'textarea', 'long_text') AND s.answer_text IS NOT NULL THEN s.response_id END) AS text_response_count,
  count(DISTINCT CASE WHEN s.response_is_test = true AND s.question_type IN ('text', 'textarea', 'long_text') AND s.answer_text IS NOT NULL THEN s.response_id END) AS test_text_response_count,
  jsonb_agg(DISTINCT s.answer_text) FILTER (WHERE s.response_is_test = false AND s.question_type IN ('text', 'textarea', 'long_text') AND s.answer_text IS NOT NULL) AS text_responses,
  jsonb_agg(DISTINCT s.answer_text) FILTER (WHERE s.response_is_test = true AND s.question_type IN ('text', 'textarea', 'long_text') AND s.answer_text IS NOT NULL) AS test_text_responses,
  (SELECT jsonb_agg(jsonb_build_object('question_text', qa.question_text, 'question_type', qa.question_type, 'satisfaction_type', qa.satisfaction_type, 'avg', qa.avg_score)) FROM real_question_avgs qa WHERE qa.instructor_id = s.instructor_id AND qa.education_year = s.education_year AND qa.education_round = s.education_round AND qa.course_name = s.course_name) AS question_stats,
  (SELECT jsonb_agg(jsonb_build_object('question_text', qa.question_text, 'question_type', qa.question_type, 'satisfaction_type', qa.satisfaction_type, 'avg', qa.avg_score)) FROM test_question_avgs qa WHERE qa.instructor_id = s.instructor_id AND qa.education_year = s.education_year AND qa.education_round = s.education_round AND qa.course_name = s.course_name) AS test_question_stats
FROM scaled s
  LEFT JOIN instructors i ON i.id = s.instructor_id
GROUP BY s.instructor_id, i.name, s.education_year, s.education_round, s.course_name;
