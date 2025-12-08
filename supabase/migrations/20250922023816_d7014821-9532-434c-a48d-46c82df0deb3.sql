-- Update get_survey_detail_stats function to include section_id
CREATE OR REPLACE FUNCTION public.get_survey_detail_stats(p_survey_id uuid, p_include_test boolean DEFAULT false, p_response_cursor integer DEFAULT 0, p_response_limit integer DEFAULT 50, p_distribution_cursor integer DEFAULT 0, p_distribution_limit integer DEFAULT 20, p_text_cursor integer DEFAULT 0, p_text_limit integer DEFAULT 50)
 RETURNS TABLE(responses jsonb, response_next_cursor integer, response_total_count bigint, question_distributions jsonb, distribution_next_cursor integer, distribution_total_count bigint, text_answers jsonb, text_next_cursor integer, text_total_count bigint, summary jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered_responses AS (
    SELECT
      sr.id,
      sr.survey_id,
      sr.session_id,
      sr.submitted_at,
      sr.respondent_email,
      COALESCE(sr.is_test, false) AS is_test
    FROM public.survey_responses sr
    WHERE sr.survey_id = p_survey_id
      AND (p_include_test OR COALESCE(sr.is_test, false) = false)
  ),
  ordered_responses AS (
    SELECT
      fr.*,
      ROW_NUMBER() OVER (ORDER BY fr.submitted_at DESC, fr.id DESC) AS rn
    FROM filtered_responses fr
  ),
  response_total AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM ordered_responses
  ),
  response_page AS (
    SELECT *
    FROM ordered_responses
    WHERE rn > COALESCE(p_response_cursor, 0)
    ORDER BY rn
    LIMIT GREATEST(p_response_limit, 0)
  ),
  response_json AS (
    SELECT
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', rp.id,
          'submitted_at', rp.submitted_at,
          'respondent_email', rp.respondent_email,
          'session_id', rp.session_id,
          'is_test', rp.is_test
        )
        ORDER BY rp.rn
      ), '[]'::jsonb) AS items,
      MAX(rp.rn) AS last_rn
    FROM response_page rp
  ),
  question_base AS (
    SELECT
      sq.id,
      sq.question_text,
      sq.question_type,
      sq.satisfaction_type,
      sq.order_index,
      sq.session_id,
      sq.section_id,
      sq.options
    FROM public.survey_questions sq
    WHERE sq.survey_id = p_survey_id
  ),
  question_count AS (
    SELECT COUNT(*)::bigint AS total FROM question_base
  ),
  filtered_answers AS (
    SELECT
      qa.id,
      qa.question_id,
      qa.response_id,
      qa.answer_text,
      qa.answer_value,
      qa.created_at
    FROM public.question_answers qa
    JOIN filtered_responses fr ON fr.id = qa.response_id
  ),
  answer_metrics AS (
    SELECT
      qb.id AS question_id,
      qb.question_text,
      qb.question_type,
      qb.satisfaction_type,
      qb.order_index,
      qb.session_id,
      qb.section_id,
      qb.options,
      fa.id AS answer_id,
      fa.response_id,
      fa.created_at,
      fa.answer_text,
      fa.answer_value,
      NULLIF(TRIM(BOTH '"' FROM COALESCE(fa.answer_text, fa.answer_value::text)), '') AS answer_string,
      CASE
        WHEN qb.question_type IN ('scale', 'rating')
             AND COALESCE(NULLIF(fa.answer_value::text, ''), NULLIF(fa.answer_text, '')) ~ '^[0-9]+(\.[0-9]+)?$'
        THEN CASE
          WHEN (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric <= 5
            THEN (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric * 2
          ELSE (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric
        END
        ELSE NULL
      END AS converted_rating,
      CASE
        WHEN qb.question_type IN ('scale', 'rating')
             AND COALESCE(NULLIF(fa.answer_value::text, ''), NULLIF(fa.answer_text, '')) ~ '^[0-9]+(\.[0-9]+)?$'
        THEN LEAST(
          10,
          GREATEST(
            1,
            ROUND(
              CASE
                WHEN (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric <= 5
                  THEN (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric * 2
                ELSE (COALESCE(NULLIF(fa.answer_value::text, ''), fa.answer_text))::numeric
              END
            )::int
          )
        )
        ELSE NULL
      END AS rounded_rating
    FROM question_base qb
    LEFT JOIN filtered_answers fa ON fa.question_id = qb.id
  ),
  question_stats_raw AS (
    SELECT
      am.question_id,
      MIN(am.question_text) AS question_text,
      MIN(am.question_type) AS question_type,
      MIN(am.satisfaction_type) AS satisfaction_type,
      MIN(am.order_index) AS order_index,
      MIN(am.session_id::text)::uuid AS session_id,
      MIN(am.section_id::text)::uuid AS section_id,
      MIN(am.options::text)::jsonb AS options,
      COUNT(am.answer_id) FILTER (WHERE am.answer_id IS NOT NULL) AS total_answers,
      AVG(am.converted_rating) AS average_score,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 1 THEN 1 ELSE 0 END), 0) AS rating_count_1,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 2 THEN 1 ELSE 0 END), 0) AS rating_count_2,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 3 THEN 1 ELSE 0 END), 0) AS rating_count_3,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 4 THEN 1 ELSE 0 END), 0) AS rating_count_4,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 5 THEN 1 ELSE 0 END), 0) AS rating_count_5,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 6 THEN 1 ELSE 0 END), 0) AS rating_count_6,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 7 THEN 1 ELSE 0 END), 0) AS rating_count_7,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 8 THEN 1 ELSE 0 END), 0) AS rating_count_8,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 9 THEN 1 ELSE 0 END), 0) AS rating_count_9,
      COALESCE(SUM(CASE WHEN am.rounded_rating = 10 THEN 1 ELSE 0 END), 0) AS rating_count_10
    FROM answer_metrics am
    GROUP BY am.question_id
  ),
  option_counts AS (
    SELECT
      question_id,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'option', answer_string,
          'count', option_count
        )
        ORDER BY option_count DESC, answer_string
      ), '[]'::jsonb) AS options_json
    FROM (
      SELECT
        am.question_id,
        am.answer_string,
        COUNT(*) AS option_count
      FROM answer_metrics am
      WHERE am.question_type IN ('multiple_choice', 'single_choice', 'dropdown', 'select')
        AND am.answer_string IS NOT NULL
      GROUP BY am.question_id, am.answer_string
    ) AS option_source
    GROUP BY question_id
  ),
  ordered_questions AS (
    SELECT
      qsr.*,
      COALESCE(oc.options_json, '[]'::jsonb) AS option_counts,
      ROW_NUMBER() OVER (ORDER BY qsr.order_index NULLS LAST, qsr.question_id) AS rn
    FROM question_stats_raw qsr
    LEFT JOIN option_counts oc ON oc.question_id = qsr.question_id
  ),
  question_total AS (
    SELECT COUNT(*)::bigint AS total_count FROM ordered_questions
  ),
  question_page AS (
    SELECT *
    FROM ordered_questions
    WHERE rn > COALESCE(p_distribution_cursor, 0)
    ORDER BY rn
    LIMIT GREATEST(p_distribution_limit, 0)
  ),
  question_json AS (
    SELECT
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'question_id', qp.question_id,
          'question_text', qp.question_text,
          'question_type', qp.question_type,
          'satisfaction_type', qp.satisfaction_type,
          'order_index', qp.order_index,
          'session_id', qp.session_id,
          'section_id', qp.section_id,
          'total_answers', qp.total_answers,
          'average', qp.average_score,
          'rating_distribution', jsonb_build_object(
            '1', qp.rating_count_1,
            '2', qp.rating_count_2,
            '3', qp.rating_count_3,
            '4', qp.rating_count_4,
            '5', qp.rating_count_5,
            '6', qp.rating_count_6,
            '7', qp.rating_count_7,
            '8', qp.rating_count_8,
            '9', qp.rating_count_9,
            '10', qp.rating_count_10
          ),
          'option_counts', qp.option_counts
        )
        ORDER BY qp.rn
      ), '[]'::jsonb) AS items,
      MAX(qp.rn) AS last_rn
    FROM question_page qp
  ),
  text_answers_base AS (
    SELECT
      am.answer_id,
      am.question_id,
      am.question_text,
      am.satisfaction_type,
      am.order_index,
      am.session_id,
      am.section_id,
      am.answer_text,
      am.created_at
    FROM answer_metrics am
    WHERE am.question_type IN ('text', 'long_text', 'textarea', 'paragraph')
      AND am.answer_text IS NOT NULL
  ),
  ordered_text_answers AS (
    SELECT
      tab.*,
      ROW_NUMBER() OVER (ORDER BY tab.created_at DESC, tab.answer_id) AS rn
    FROM text_answers_base tab
  ),
  text_total AS (
    SELECT COUNT(*)::bigint AS total_count FROM ordered_text_answers
  ),
  text_page AS (
    SELECT *
    FROM ordered_text_answers
    WHERE rn > COALESCE(p_text_cursor, 0)
    ORDER BY rn
    LIMIT GREATEST(p_text_limit, 0)
  ),
  text_json AS (
    SELECT
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'answer_id', tp.answer_id,
          'question_id', tp.question_id,
          'question_text', tp.question_text,
          'satisfaction_type', tp.satisfaction_type,
          'order_index', tp.order_index,
          'session_id', tp.session_id,
          'section_id', tp.section_id,
          'answer_text', tp.answer_text,
          'created_at', tp.created_at
        )
        ORDER BY tp.rn
      ), '[]'::jsonb) AS items,
      MAX(tp.rn) AS last_rn
    FROM text_page tp
  ),
  summary_stats AS (
    SELECT
      AVG(am.converted_rating) AS avg_overall,
      AVG(am.converted_rating) FILTER (WHERE am.satisfaction_type = 'course') AS avg_course,
      AVG(am.converted_rating) FILTER (WHERE am.satisfaction_type = 'instructor') AS avg_instructor,
      AVG(am.converted_rating) FILTER (WHERE am.satisfaction_type = 'operation') AS avg_operation,
      COUNT(DISTINCT am.response_id) FILTER (WHERE am.converted_rating IS NOT NULL) AS rating_response_count
    FROM answer_metrics am
  )
  SELECT
    rj.items AS responses,
    CASE
      WHEN rj.last_rn IS NOT NULL AND rj.last_rn < rt.total_count THEN rj.last_rn
      ELSE NULL
    END AS response_next_cursor,
    rt.total_count AS response_total_count,
    qj.items AS question_distributions,
    CASE
      WHEN qj.last_rn IS NOT NULL AND qj.last_rn < qt.total_count THEN qj.last_rn
      ELSE NULL
    END AS distribution_next_cursor,
    qt.total_count AS distribution_total_count,
    tj.items AS text_answers,
    CASE
      WHEN tj.last_rn IS NOT NULL AND tj.last_rn < tt.total_count THEN tj.last_rn
      ELSE NULL
    END AS text_next_cursor,
    tt.total_count AS text_total_count,
    jsonb_build_object(
      'responseCount', rt.total_count,
      'ratingResponseCount', COALESCE(ss.rating_response_count, 0),
      'avgOverall', ss.avg_overall,
      'avgCourse', ss.avg_course,
      'avgInstructor', ss.avg_instructor,
      'avgOperation', ss.avg_operation,
      'questionCount', qc.total,
      'textAnswerCount', tt.total_count
    ) AS summary
  FROM response_json rj
  CROSS JOIN response_total rt
  CROSS JOIN question_json qj
  CROSS JOIN question_total qt
  CROSS JOIN text_json tj
  CROSS JOIN text_total tt
  CROSS JOIN question_count qc
  CROSS JOIN summary_stats ss;
$function$;