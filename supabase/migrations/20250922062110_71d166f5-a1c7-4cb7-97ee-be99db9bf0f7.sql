-- Fix survey_aggregates view to properly handle JSONB answer_value with quotes
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
    COALESCE((
        SELECT COUNT(*)
        FROM survey_questions sq_all
        WHERE sq_all.survey_id = s.id
    ), 0) AS question_count,
    COUNT(DISTINCT sr.id) AS response_count,
    MAX(sr.submitted_at) AS last_response_at,
    -- Overall satisfaction (all scale/rating questions)
    AVG(
        CASE 
            WHEN sq.question_type IN ('scale', 'rating') 
                AND public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) IS NOT NULL 
            THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) <= 5
                    THEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) * 2
                    ELSE public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')))
                END
            ELSE NULL
        END
    ) AS avg_overall_satisfaction,
    -- Course satisfaction
    AVG(
        CASE 
            WHEN sq.question_type IN ('scale', 'rating') 
                AND sq.satisfaction_type = 'course'
                AND public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) IS NOT NULL 
            THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) <= 5
                    THEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) * 2
                    ELSE public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')))
                END
            ELSE NULL
        END
    ) AS avg_course_satisfaction,
    -- Instructor satisfaction
    AVG(
        CASE 
            WHEN sq.question_type IN ('scale', 'rating') 
                AND sq.satisfaction_type = 'instructor'
                AND public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) IS NOT NULL 
            THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) <= 5
                    THEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) * 2
                    ELSE public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')))
                END
            ELSE NULL
        END
    ) AS avg_instructor_satisfaction,
    -- Operation satisfaction
    AVG(
        CASE 
            WHEN sq.question_type IN ('scale', 'rating') 
                AND sq.satisfaction_type = 'operation'
                AND public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) IS NOT NULL 
            THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) <= 5
                    THEN public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, ''))) * 2
                    ELSE public.safe_numeric_convert(COALESCE(NULLIF(qa.answer_value::text, ''), NULLIF(qa.answer_text, '')))
                END
            ELSE NULL
        END
    ) AS avg_operation_satisfaction
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
LEFT JOIN question_answers qa ON qa.response_id = sr.id
LEFT JOIN survey_questions sq ON sq.id = qa.question_id
WHERE s.status IN ('completed', 'active', 'public')
GROUP BY s.id, s.title, s.education_year, s.education_round, s.course_name, s.status, s.instructor_id, i.name, s.expected_participants, s.is_test;