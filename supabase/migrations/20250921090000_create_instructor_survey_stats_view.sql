-- View aggregating instructor survey statistics including satisfaction scores,
-- response counts, and collected text feedback so the application can render
-- dashboards without downloading raw answers.
DROP VIEW IF EXISTS public.instructor_survey_stats;

CREATE VIEW public.instructor_survey_stats AS
WITH base_answers AS (
  SELECT
    s.instructor_id,
    i.name AS instructor_name,
    s.education_year,
    s.education_round,
    s.course_name,
    s.status,
    s.id AS survey_id,
    s.is_test,
    sr.id AS response_id,
    sr.submitted_at,
    sq.id AS question_id,
    sq.question_text,
    sq.question_type,
    sq.satisfaction_type,
    sq.order_index,
    qa.answer_text,
    CASE
      WHEN COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')) ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
        THEN CASE
          WHEN (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric <= 5
            THEN (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric * 2
          ELSE (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric
        END
      ELSE NULL
    END AS converted_rating,
    CASE
      WHEN COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')) ~ '^[0-9]+(\.[0-9]+)?$'
           AND sq.question_type IN ('scale', 'rating')
        THEN LEAST(
          10,
          GREATEST(
            1,
            ROUND(
              CASE
                WHEN (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric <= 5
                  THEN (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric * 2
                ELSE (COALESCE(NULLIF(qa.answer_value::text, ''), qa.answer_text))::numeric
              END
            )::int
          )
        )
      ELSE NULL
    END AS rounded_rating
  FROM public.surveys s
  LEFT JOIN public.instructors i ON i.id = s.instructor_id
  LEFT JOIN public.survey_responses sr ON sr.survey_id = s.id
  LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
  LEFT JOIN public.survey_questions sq ON sq.id = qa.question_id
  WHERE s.status IN ('completed', 'active')
    AND s.instructor_id IS NOT NULL
),
aggregated AS (
  SELECT
    instructor_id,
    instructor_name,
    education_year,
    education_round,
    course_name,
    ARRAY_AGG(DISTINCT survey_id) AS survey_ids,
    COUNT(DISTINCT survey_id) FILTER (WHERE COALESCE(is_test, false) = false) AS survey_count,
    COUNT(DISTINCT survey_id) FILTER (WHERE COALESCE(is_test, false) = true) AS test_survey_count,
    COUNT(DISTINCT survey_id) FILTER (
      WHERE COALESCE(is_test, false) = false AND status = 'active'
    ) AS active_survey_count,
    COUNT(DISTINCT survey_id) FILTER (
      WHERE COALESCE(is_test, false) = true AND status = 'active'
    ) AS test_active_survey_count,
    COUNT(DISTINCT response_id) FILTER (WHERE COALESCE(is_test, false) = false) AS response_count,
    COUNT(DISTINCT response_id) FILTER (WHERE COALESCE(is_test, false) = true) AS test_response_count,
    MAX(submitted_at) AS last_response_at,
    BOOL_OR(COALESCE(is_test, false)) AS has_test_data,
    BOOL_AND(COALESCE(is_test, false)) AS all_test_data,
    AVG(converted_rating) FILTER (WHERE COALESCE(is_test, false) = false) AS avg_overall_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = false AND satisfaction_type = 'course'
    ) AS avg_course_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = false AND satisfaction_type = 'instructor'
    ) AS avg_instructor_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = false AND satisfaction_type = 'operation'
    ) AS avg_operation_satisfaction,
    AVG(converted_rating) FILTER (WHERE COALESCE(is_test, false) = true) AS test_avg_overall_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = true AND satisfaction_type = 'course'
    ) AS test_avg_course_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = true AND satisfaction_type = 'instructor'
    ) AS test_avg_instructor_satisfaction,
    AVG(converted_rating) FILTER (
      WHERE COALESCE(is_test, false) = true AND satisfaction_type = 'operation'
    ) AS test_avg_operation_satisfaction,
    COALESCE(SUM(CASE WHEN rounded_rating = 1  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_1,
    COALESCE(SUM(CASE WHEN rounded_rating = 2  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_2,
    COALESCE(SUM(CASE WHEN rounded_rating = 3  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_3,
    COALESCE(SUM(CASE WHEN rounded_rating = 4  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_4,
    COALESCE(SUM(CASE WHEN rounded_rating = 5  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_5,
    COALESCE(SUM(CASE WHEN rounded_rating = 6  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_6,
    COALESCE(SUM(CASE WHEN rounded_rating = 7  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_7,
    COALESCE(SUM(CASE WHEN rounded_rating = 8  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_8,
    COALESCE(SUM(CASE WHEN rounded_rating = 9  AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_9,
    COALESCE(SUM(CASE WHEN rounded_rating = 10 AND COALESCE(is_test, false) = false THEN 1 ELSE 0 END), 0) AS rating_count_10,
    COALESCE(SUM(CASE WHEN rounded_rating = 1  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_1,
    COALESCE(SUM(CASE WHEN rounded_rating = 2  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_2,
    COALESCE(SUM(CASE WHEN rounded_rating = 3  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_3,
    COALESCE(SUM(CASE WHEN rounded_rating = 4  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_4,
    COALESCE(SUM(CASE WHEN rounded_rating = 5  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_5,
    COALESCE(SUM(CASE WHEN rounded_rating = 6  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_6,
    COALESCE(SUM(CASE WHEN rounded_rating = 7  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_7,
    COALESCE(SUM(CASE WHEN rounded_rating = 8  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_8,
    COALESCE(SUM(CASE WHEN rounded_rating = 9  AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_9,
    COALESCE(SUM(CASE WHEN rounded_rating = 10 AND COALESCE(is_test, false) = true THEN 1 ELSE 0 END), 0) AS test_rating_count_10,
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(is_test, false) = false
               AND question_type IN ('text', 'long_text', 'textarea', 'paragraph')
               AND answer_text IS NOT NULL
            THEN 1
          ELSE 0
        END
      ),
      0
    ) AS text_response_count,
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(is_test, false) = true
               AND question_type IN ('text', 'long_text', 'textarea', 'paragraph')
               AND answer_text IS NOT NULL
            THEN 1
          ELSE 0
        END
      ),
      0
    ) AS test_text_response_count
  FROM base_answers
  GROUP BY
    instructor_id,
    instructor_name,
    education_year,
    education_round,
    course_name
),
question_aggregated AS (
  SELECT
    instructor_id,
    education_year,
    education_round,
    course_name,
    question_id,
    MIN(question_text) AS question_text,
    MIN(question_type) AS question_type,
    MIN(satisfaction_type) AS satisfaction_type,
    MIN(order_index) AS order_index,
    COUNT(*) FILTER (
      WHERE converted_rating IS NOT NULL OR answer_text IS NOT NULL
    ) AS total_answers,
    AVG(converted_rating) AS average,
    COALESCE(SUM(CASE WHEN rounded_rating = 1 THEN 1 ELSE 0 END), 0) AS rating_count_1,
    COALESCE(SUM(CASE WHEN rounded_rating = 2 THEN 1 ELSE 0 END), 0) AS rating_count_2,
    COALESCE(SUM(CASE WHEN rounded_rating = 3 THEN 1 ELSE 0 END), 0) AS rating_count_3,
    COALESCE(SUM(CASE WHEN rounded_rating = 4 THEN 1 ELSE 0 END), 0) AS rating_count_4,
    COALESCE(SUM(CASE WHEN rounded_rating = 5 THEN 1 ELSE 0 END), 0) AS rating_count_5,
    COALESCE(SUM(CASE WHEN rounded_rating = 6 THEN 1 ELSE 0 END), 0) AS rating_count_6,
    COALESCE(SUM(CASE WHEN rounded_rating = 7 THEN 1 ELSE 0 END), 0) AS rating_count_7,
    COALESCE(SUM(CASE WHEN rounded_rating = 8 THEN 1 ELSE 0 END), 0) AS rating_count_8,
    COALESCE(SUM(CASE WHEN rounded_rating = 9 THEN 1 ELSE 0 END), 0) AS rating_count_9,
    COALESCE(SUM(CASE WHEN rounded_rating = 10 THEN 1 ELSE 0 END), 0) AS rating_count_10,
    CASE
      WHEN BOOL_OR(question_type IN ('text', 'long_text', 'textarea', 'paragraph'))
        THEN COALESCE(jsonb_agg(answer_text) FILTER (WHERE answer_text IS NOT NULL), '[]'::jsonb)
      ELSE '[]'::jsonb
    END AS text_answers
  FROM base_answers
  WHERE COALESCE(is_test, false) = false
  GROUP BY
    instructor_id,
    education_year,
    education_round,
    course_name,
    question_id
),
test_question_aggregated AS (
  SELECT
    instructor_id,
    education_year,
    education_round,
    course_name,
    question_id,
    MIN(question_text) AS question_text,
    MIN(question_type) AS question_type,
    MIN(satisfaction_type) AS satisfaction_type,
    MIN(order_index) AS order_index,
    COUNT(*) FILTER (
      WHERE converted_rating IS NOT NULL OR answer_text IS NOT NULL
    ) AS total_answers,
    AVG(converted_rating) AS average,
    COALESCE(SUM(CASE WHEN rounded_rating = 1 THEN 1 ELSE 0 END), 0) AS rating_count_1,
    COALESCE(SUM(CASE WHEN rounded_rating = 2 THEN 1 ELSE 0 END), 0) AS rating_count_2,
    COALESCE(SUM(CASE WHEN rounded_rating = 3 THEN 1 ELSE 0 END), 0) AS rating_count_3,
    COALESCE(SUM(CASE WHEN rounded_rating = 4 THEN 1 ELSE 0 END), 0) AS rating_count_4,
    COALESCE(SUM(CASE WHEN rounded_rating = 5 THEN 1 ELSE 0 END), 0) AS rating_count_5,
    COALESCE(SUM(CASE WHEN rounded_rating = 6 THEN 1 ELSE 0 END), 0) AS rating_count_6,
    COALESCE(SUM(CASE WHEN rounded_rating = 7 THEN 1 ELSE 0 END), 0) AS rating_count_7,
    COALESCE(SUM(CASE WHEN rounded_rating = 8 THEN 1 ELSE 0 END), 0) AS rating_count_8,
    COALESCE(SUM(CASE WHEN rounded_rating = 9 THEN 1 ELSE 0 END), 0) AS rating_count_9,
    COALESCE(SUM(CASE WHEN rounded_rating = 10 THEN 1 ELSE 0 END), 0) AS rating_count_10,
    CASE
      WHEN BOOL_OR(question_type IN ('text', 'long_text', 'textarea', 'paragraph'))
        THEN COALESCE(jsonb_agg(answer_text) FILTER (WHERE answer_text IS NOT NULL), '[]'::jsonb)
      ELSE '[]'::jsonb
    END AS text_answers
  FROM base_answers
  WHERE COALESCE(is_test, false) = true
  GROUP BY
    instructor_id,
    education_year,
    education_round,
    course_name,
    question_id
)
SELECT
  aggregated.instructor_id,
  aggregated.instructor_name,
  aggregated.education_year,
  aggregated.education_round,
  aggregated.course_name,
  aggregated.survey_ids,
  aggregated.survey_count,
  aggregated.test_survey_count,
  aggregated.active_survey_count,
  aggregated.test_active_survey_count,
  aggregated.response_count,
  aggregated.test_response_count,
  aggregated.last_response_at,
  aggregated.has_test_data,
  aggregated.all_test_data,
  aggregated.avg_overall_satisfaction,
  aggregated.avg_course_satisfaction,
  aggregated.avg_instructor_satisfaction,
  aggregated.avg_operation_satisfaction,
  aggregated.test_avg_overall_satisfaction,
  aggregated.test_avg_course_satisfaction,
  aggregated.test_avg_instructor_satisfaction,
  aggregated.test_avg_operation_satisfaction,
  aggregated.text_response_count,
  aggregated.test_text_response_count,
  jsonb_build_object(
    '1', aggregated.rating_count_1,
    '2', aggregated.rating_count_2,
    '3', aggregated.rating_count_3,
    '4', aggregated.rating_count_4,
    '5', aggregated.rating_count_5,
    '6', aggregated.rating_count_6,
    '7', aggregated.rating_count_7,
    '8', aggregated.rating_count_8,
    '9', aggregated.rating_count_9,
    '10', aggregated.rating_count_10
  ) AS rating_distribution,
  jsonb_build_object(
    '1', aggregated.test_rating_count_1,
    '2', aggregated.test_rating_count_2,
    '3', aggregated.test_rating_count_3,
    '4', aggregated.test_rating_count_4,
    '5', aggregated.test_rating_count_5,
    '6', aggregated.test_rating_count_6,
    '7', aggregated.test_rating_count_7,
    '8', aggregated.test_rating_count_8,
    '9', aggregated.test_rating_count_9,
    '10', aggregated.test_rating_count_10
  ) AS test_rating_distribution,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'question_id', qa.question_id,
          'question_text', qa.question_text,
          'question_type', qa.question_type,
          'satisfaction_type', qa.satisfaction_type,
          'order_index', qa.order_index,
          'total_answers', qa.total_answers,
          'average', qa.average,
          'rating_distribution', jsonb_build_object(
            '1', qa.rating_count_1,
            '2', qa.rating_count_2,
            '3', qa.rating_count_3,
            '4', qa.rating_count_4,
            '5', qa.rating_count_5,
            '6', qa.rating_count_6,
            '7', qa.rating_count_7,
            '8', qa.rating_count_8,
            '9', qa.rating_count_9,
            '10', qa.rating_count_10
          ),
          'text_answers', qa.text_answers
        )
        ORDER BY qa.order_index
      )
      FROM question_aggregated qa
      WHERE qa.instructor_id = aggregated.instructor_id
        AND qa.education_year = aggregated.education_year
        AND qa.education_round = aggregated.education_round
        AND (
          (qa.course_name IS NULL AND aggregated.course_name IS NULL)
          OR qa.course_name = aggregated.course_name
        )
    ),
    '[]'::jsonb
  ) AS question_stats,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'question_id', qa.question_id,
          'question_text', qa.question_text,
          'question_type', qa.question_type,
          'satisfaction_type', qa.satisfaction_type,
          'order_index', qa.order_index,
          'total_answers', qa.total_answers,
          'average', qa.average,
          'rating_distribution', jsonb_build_object(
            '1', qa.rating_count_1,
            '2', qa.rating_count_2,
            '3', qa.rating_count_3,
            '4', qa.rating_count_4,
            '5', qa.rating_count_5,
            '6', qa.rating_count_6,
            '7', qa.rating_count_7,
            '8', qa.rating_count_8,
            '9', qa.rating_count_9,
            '10', qa.rating_count_10
          ),
          'text_answers', qa.text_answers
        )
        ORDER BY qa.order_index
      )
      FROM test_question_aggregated qa
      WHERE qa.instructor_id = aggregated.instructor_id
        AND qa.education_year = aggregated.education_year
        AND qa.education_round = aggregated.education_round
        AND (
          (qa.course_name IS NULL AND aggregated.course_name IS NULL)
          OR qa.course_name = aggregated.course_name
        )
    ),
    '[]'::jsonb
  ) AS test_question_stats,
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT text_value)
      FROM (
        SELECT jsonb_array_elements_text(qa.text_answers) AS text_value
        FROM question_aggregated qa
        WHERE qa.instructor_id = aggregated.instructor_id
          AND qa.education_year = aggregated.education_year
          AND qa.education_round = aggregated.education_round
          AND (
            (qa.course_name IS NULL AND aggregated.course_name IS NULL)
            OR qa.course_name = aggregated.course_name
          )
      ) AS t
    ),
    '[]'::jsonb
  ) AS text_responses,
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT text_value)
      FROM (
        SELECT jsonb_array_elements_text(qa.text_answers) AS text_value
        FROM test_question_aggregated qa
        WHERE qa.instructor_id = aggregated.instructor_id
          AND qa.education_year = aggregated.education_year
          AND qa.education_round = aggregated.education_round
          AND (
            (qa.course_name IS NULL AND aggregated.course_name IS NULL)
            OR qa.course_name = aggregated.course_name
          )
      ) AS t
    ),
    '[]'::jsonb
  ) AS test_text_responses
FROM aggregated
ORDER BY education_year DESC, education_round DESC, course_name;

COMMENT ON VIEW public.instructor_survey_stats IS 'Aggregated instructor-level survey statistics including satisfaction scores, response totals, and collected text feedback.';
