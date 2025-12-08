-- 설문 테이블에 분반 관련 필드 추가
ALTER TABLE public.surveys 
ADD COLUMN group_type text,
ADD COLUMN group_number integer,
ADD COLUMN is_grouped boolean DEFAULT false;

-- 분반 정보에 대한 코멘트 추가
COMMENT ON COLUMN public.surveys.group_type IS '분반 유형 (예: 짝수조, 홀수조)';
COMMENT ON COLUMN public.surveys.group_number IS '조 번호 (예: 11, 12)';
COMMENT ON COLUMN public.is_grouped IS '동일 과목 분반 합산 여부';

-- 분반별 설문을 과목별로 합산하는 뷰 생성
CREATE OR REPLACE VIEW public.grouped_survey_results AS
SELECT 
  education_year,
  education_round,
  course_name,
  COUNT(DISTINCT id) as total_surveys,
  SUM(
    (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id)
  ) as total_responses,
  AVG(
    (SELECT AVG(
      CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' AND sq.question_type = 'scale' AND sq.satisfaction_type = 'instructor'
        THEN (qa.answer_value::text)::numeric * CASE WHEN (qa.answer_value::text)::numeric <= 5 THEN 2 ELSE 1 END
      END
    )
    FROM survey_responses sr
    JOIN question_answers qa ON sr.id = qa.response_id
    JOIN survey_questions sq ON qa.question_id = sq.id
    WHERE sr.survey_id = s.id)
  ) as avg_instructor_satisfaction,
  AVG(
    (SELECT AVG(
      CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' AND sq.question_type = 'scale' AND sq.satisfaction_type = 'course'
        THEN (qa.answer_value::text)::numeric * CASE WHEN (qa.answer_value::text)::numeric <= 5 THEN 2 ELSE 1 END
      END
    )
    FROM survey_responses sr
    JOIN question_answers qa ON sr.id = qa.response_id
    JOIN survey_questions sq ON qa.question_id = sq.id
    WHERE sr.survey_id = s.id)
  ) as avg_course_satisfaction,
  AVG(
    (SELECT AVG(
      CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' AND sq.question_type = 'scale' AND sq.satisfaction_type = 'operation'
        THEN (qa.answer_value::text)::numeric * CASE WHEN (qa.answer_value::text)::numeric <= 5 THEN 2 ELSE 1 END
      END
    )
    FROM survey_responses sr
    JOIN question_answers qa ON sr.id = qa.response_id
    JOIN survey_questions sq ON qa.question_id = sq.id
    WHERE sr.survey_id = s.id)
  ) as avg_operation_satisfaction,
  array_agg(DISTINCT group_number ORDER BY group_number) as group_numbers,
  array_agg(DISTINCT group_type) as group_types
FROM public.surveys s
WHERE s.status IN ('completed', 'active')
  AND s.course_name IS NOT NULL
GROUP BY education_year, education_round, course_name;