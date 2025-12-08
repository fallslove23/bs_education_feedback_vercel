-- Convert remaining SECURITY DEFINER views to SECURITY INVOKER
-- Continue with remaining views

BEGIN;

-- 3. program_sessions_v1 (with correct table reference)
CREATE OR REPLACE VIEW public.program_sessions_v1
WITH (security_invoker = true)
AS SELECT ps.program_id,
    p.name AS program_title,
    ps.session_id,
    ss.session_name AS session_title,
    ps.sort_order,
    ps.is_active
   FROM ((program_sessions ps
     JOIN programs p ON ((p.id = ps.program_id)))
     JOIN survey_sessions ss ON ((ss.id = ps.session_id)))
  WHERE COALESCE(ps.is_active, true)
  ORDER BY p.name, ps.sort_order, ss.session_name;

-- 4. survey_aggregates  
CREATE OR REPLACE VIEW public.survey_aggregates
WITH (security_invoker = true)
AS SELECT 
    s.id AS survey_id,
    s.title,
    s.education_year,
    s.education_round,
    s.course_name,
    s.status,
    s.instructor_id,
    i.name AS instructor_name,
    s.is_test,
    s.expected_participants,
    COUNT(DISTINCT sr.id) AS response_count,
    COUNT(DISTINCT sq.id) AS question_count,
    MAX(sr.submitted_at) AS last_response_at,
    AVG(
        CASE 
            WHEN sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_overall_satisfaction,
    AVG(
        CASE 
            WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_course_satisfaction,
    AVG(
        CASE 
            WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_instructor_satisfaction,
    AVG(
        CASE 
            WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_operation_satisfaction
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
LEFT JOIN question_answers qa ON qa.response_id = sr.id
LEFT JOIN survey_questions sq ON sq.id = qa.question_id
WHERE s.status IN ('completed', 'active')
GROUP BY s.id, s.title, s.education_year, s.education_round, s.course_name, s.status, s.instructor_id, i.name, s.is_test, s.expected_participants;

COMMIT;