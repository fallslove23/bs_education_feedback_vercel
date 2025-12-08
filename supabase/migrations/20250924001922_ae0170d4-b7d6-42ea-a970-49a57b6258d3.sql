-- 누락된 뷰들과 RLS 정책 재생성
BEGIN;

-- 1. survey_aggregates 뷰 재생성 (데이터 집계용)
CREATE VIEW public.survey_aggregates
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

-- 2. survey_cumulative_stats 뷰 재생성
CREATE VIEW public.survey_cumulative_stats
WITH (security_invoker = true)
AS SELECT 
    s.id AS survey_id,
    s.title,
    s.education_year,
    s.education_round,
    s.course_name,
    s.status,
    s.instructor_id,
    s.is_test AS survey_is_test,
    s.expected_participants,
    s.created_at,
    i.name AS instructor_names,
    COUNT(DISTINCT CASE WHEN i2.id IS NOT NULL THEN i2.id END) AS instructor_count,
    COUNT(DISTINCT sr.id) AS total_response_count,
    COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = false THEN sr.id END) AS real_response_count,
    COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = true THEN sr.id END) AS test_response_count,
    MAX(sr.submitted_at) AS last_response_at,
    
    -- 전체 만족도
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
    ) AS avg_satisfaction_total,
    
    -- 실제 데이터만
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_satisfaction_real,
    
    -- 테스트 데이터만  
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_satisfaction_test,
    
    -- 과정 만족도
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
    ) AS avg_course_satisfaction_total,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_course_satisfaction_real,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_course_satisfaction_test,
    
    -- 강사 만족도
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
    ) AS avg_instructor_satisfaction_total,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_instructor_satisfaction_real,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_instructor_satisfaction_test,
    
    -- 운영 만족도
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
    ) AS avg_operation_satisfaction_total,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_operation_satisfaction_real,
    
    AVG(
        CASE 
            WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating') THEN
                CASE 
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                    WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                        THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                    ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
                END
            ELSE NULL
        END
    ) AS avg_operation_satisfaction_test
    
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN instructors i2 ON i2.id = s.instructor_id -- 강사 수 계산용
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
LEFT JOIN question_answers qa ON qa.response_id = sr.id
LEFT JOIN survey_questions sq ON sq.id = qa.question_id
WHERE s.status IN ('completed', 'active')
GROUP BY s.id, s.title, s.education_year, s.education_round, s.course_name, s.status, s.instructor_id, s.is_test, s.expected_participants, s.created_at, i.name;

COMMIT;