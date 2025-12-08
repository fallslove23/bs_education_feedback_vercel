-- Convert SECURITY DEFINER views to SECURITY INVOKER (Fixed Syntax)
-- This addresses the Security Definer View linter errors

BEGIN;

-- 1. active_surveys_v
CREATE OR REPLACE VIEW public.active_surveys_v
WITH (security_invoker = true)
AS SELECT id,
    title,
    description,
    instructor_id,
    course_id,
    template_id,
    status,
    start_date,
    end_date,
    created_by,
    created_at,
    updated_at,
    education_year,
    education_round,
    expected_participants,
    course_name,
    education_day
   FROM surveys s
  WHERE ((status = 'active'::text) AND ((start_date IS NULL) OR (now() >= start_date)) AND ((end_date IS NULL) OR (now() <= end_date)));

-- 2. survey_available_years_v1  
CREATE OR REPLACE VIEW public.survey_available_years_v1
WITH (security_invoker = true)
AS SELECT DISTINCT education_year
   FROM surveys
  WHERE education_year IS NOT NULL
  ORDER BY education_year DESC;

-- 3. program_sessions_v1
CREATE OR REPLACE VIEW public.program_sessions_v1
WITH (security_invoker = true)
AS SELECT ps.program_id,
    ps.session_id,
    ps.sort_order,
    ps.is_active,
    p.name AS program_title,
    s.title AS session_title
   FROM program_sessions ps
     LEFT JOIN programs p ON p.id = ps.program_id
     LEFT JOIN survey_sessions s ON s.id = ps.session_id;

-- 4. instructor_survey_stats (if it's a view)
DROP VIEW IF EXISTS public.instructor_survey_stats CASCADE;
CREATE OR REPLACE VIEW public.instructor_survey_stats
WITH (security_invoker = true)
AS WITH base_answers AS (
         SELECT s.instructor_id,
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
                    WHEN ((COALESCE(NULLIF((qa.answer_value)::text, ''::text), NULLIF(qa.answer_text, ''::text)) ~ '^[0-9]+(\.[0-9]+)?$'::text) AND (sq.question_type = ANY (ARRAY['scale'::text, 'rating'::text]))) THEN
                    CASE
                        WHEN ((COALESCE(NULLIF((qa.answer_value)::text, ''::text), qa.answer_text))::numeric <= (5)::numeric) THEN ((COALESCE(NULLIF((qa.answer_value)::text, ''::text), qa.answer_text))::numeric * (2)::numeric)
                        ELSE (COALESCE(NULLIF((qa.answer_value)::text, ''::text), qa.answer_text))::numeric
                    END
                    ELSE NULL::numeric
                END AS converted_rating
           FROM ((((surveys s
             LEFT JOIN instructors i ON ((i.id = s.instructor_id)))
             LEFT JOIN survey_responses sr ON ((sr.survey_id = s.id)))
             LEFT JOIN question_answers qa ON ((qa.response_id = sr.id)))
             LEFT JOIN survey_questions sq ON ((sq.id = qa.question_id)))
          WHERE ((s.status = ANY (ARRAY['completed'::text, 'active'::text])) AND (s.instructor_id IS NOT NULL))
        )
 SELECT base_answers.instructor_id,
    base_answers.instructor_name,
    base_answers.education_year,
    base_answers.education_round,
    base_answers.course_name,
    array_agg(DISTINCT base_answers.survey_id) AS survey_ids,
    count(DISTINCT base_answers.survey_id) FILTER (WHERE (COALESCE(base_answers.is_test, false) = false)) AS survey_count,
    count(DISTINCT base_answers.survey_id) FILTER (WHERE (COALESCE(base_answers.is_test, false) = true)) AS test_survey_count,
    count(DISTINCT base_answers.response_id) FILTER (WHERE (COALESCE(base_answers.is_test, false) = false)) AS response_count,
    count(DISTINCT base_answers.response_id) FILTER (WHERE (COALESCE(base_answers.is_test, false) = true)) AS test_response_count,
    max(base_answers.submitted_at) AS last_response_at,
    bool_or(COALESCE(base_answers.is_test, false)) AS has_test_data,
    bool_and(COALESCE(base_answers.is_test, false)) AS all_test_data,
    avg(base_answers.converted_rating) FILTER (WHERE (COALESCE(base_answers.is_test, false) = false)) AS avg_overall_satisfaction,
    avg(base_answers.converted_rating) FILTER (WHERE ((COALESCE(base_answers.is_test, false) = false) AND (base_answers.satisfaction_type = 'course'::text))) AS avg_course_satisfaction,
    avg(base_answers.converted_rating) FILTER (WHERE ((COALESCE(base_answers.is_test, false) = false) AND (base_answers.satisfaction_type = 'instructor'::text))) AS avg_instructor_satisfaction,
    avg(base_answers.converted_rating) FILTER (WHERE ((COALESCE(base_answers.is_test, false) = false) AND (base_answers.satisfaction_type = 'operation'::text))) AS avg_operation_satisfaction
   FROM base_answers
  GROUP BY base_answers.instructor_id, base_answers.instructor_name, base_answers.education_year, base_answers.education_round, base_answers.course_name;

COMMIT;