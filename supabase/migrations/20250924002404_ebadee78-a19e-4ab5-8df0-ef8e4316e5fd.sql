-- 기존 뷰 삭제 후 재생성
BEGIN;

-- 기존 뷰들 완전 삭제
DROP VIEW IF EXISTS public.survey_cumulative_stats CASCADE;

-- survey_cumulative_stats 뷰 재생성 (단순화된 버전)
CREATE VIEW public.survey_cumulative_stats  
WITH (security_invoker = true)
AS SELECT 
    s.id AS survey_id,
    s.title,
    s.education_year,
    s.education_round,
    s.course_name,
    s.status,
    s.expected_participants,
    s.created_at,
    s.is_test AS survey_is_test,
    
    COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN i.id END) AS instructor_count,
    COUNT(DISTINCT sr.id) AS total_response_count,
    COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = false THEN sr.id END) AS real_response_count,
    COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = true THEN sr.id END) AS test_response_count,
    MAX(sr.submitted_at) AS last_response_at,
    
    array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) AS instructor_names,
    string_agg(DISTINCT i.name, ', ') AS instructor_names_text,
    
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
    AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating') 
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_course_satisfaction_total,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_course_satisfaction_real,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_course_satisfaction_test,
    
    -- 강사 만족도
    AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_instructor_satisfaction_total,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_instructor_satisfaction_real,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_instructor_satisfaction_test,
    
    -- 운영 만족도
    AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_operation_satisfaction_total,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_operation_satisfaction_real,
        
    AVG(CASE WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale','rating')
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        ELSE NULL END) AS avg_operation_satisfaction_test,
    
    -- 가중 만족도 (기존 컬럼명과 맞춤)
    AVG(CASE WHEN COALESCE(sr.is_test, false) = false 
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        END) * COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = false THEN sr.id END) AS weighted_satisfaction_real,
    
    AVG(CASE WHEN COALESCE(sr.is_test, false) = true 
        THEN CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
                  WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                      THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
                  ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END
        END) * COUNT(DISTINCT CASE WHEN COALESCE(sr.is_test, false) = true THEN sr.id END) AS weighted_satisfaction_test,
    
    AVG(CASE WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
             WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
                 THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
             ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) END) * 
    COUNT(DISTINCT sr.id) AS weighted_satisfaction_total
    
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id  
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
LEFT JOIN question_answers qa ON qa.response_id = sr.id
LEFT JOIN survey_questions sq ON sq.id = qa.question_id
WHERE s.status IN ('completed', 'active')
GROUP BY s.id, s.title, s.education_year, s.education_round, s.course_name, s.status, s.expected_participants, s.created_at, s.is_test;

-- RLS 정책도 단순화 (기존 복잡한 정책들 제거)
DROP POLICY IF EXISTS "instructor sees own-session responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can view all survey responses" ON public.survey_responses;

-- 단순하고 효과적인 RLS 정책 재생성
CREATE POLICY "admins and operators see all responses"
ON public.survey_responses
FOR SELECT
USING (is_admin() OR is_operator() OR is_director());

-- 강사는 본인 설문의 응답만 (세션 기반이 아닌 설문 기반)
CREATE POLICY "instructors see own survey responses"
ON public.survey_responses
FOR SELECT  
USING (
  is_instructor() AND EXISTS (
    SELECT 1 FROM surveys s
    JOIN instructors i ON i.id = s.instructor_id
    WHERE s.id = survey_responses.survey_id
      AND i.user_id = auth.uid()
  )
);

COMMIT;