-- 기존 뷰 제거 (의존 객체 있으면 CASCADE가 필요할 수 있음)
DROP VIEW IF EXISTS public.instructor_survey_stats CASCADE;

CREATE VIEW public.instructor_survey_stats AS
WITH instructor_survey_map AS (
  SELECT DISTINCT 
    ss.instructor_id,
    ss.survey_id,
    s.education_year,
    s.education_round,
    s.course_name,
    s.is_test,
    s.status
  FROM public.survey_sessions ss
  JOIN public.surveys s ON s.id = ss.survey_id
  WHERE ss.instructor_id IS NOT NULL
),
responses AS (
  SELECT
    ism.instructor_id,
    ism.survey_id,
    ism.education_year,
    ism.education_round,
    ism.course_name,
    ism.is_test           AS survey_is_test,
    ism.status,
    sr.id                 AS response_id,
    COALESCE(sr.is_test,false) AS response_is_test,
    sr.submitted_at
  FROM instructor_survey_map ism
  LEFT JOIN public.survey_responses sr ON sr.survey_id = ism.survey_id
),
answers AS (
  SELECT
    r.instructor_id,
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
  LEFT JOIN public.question_answers qa ON qa.response_id = r.response_id
  LEFT JOIN public.survey_questions  sq ON sq.id = qa.question_id
),
-- 숫자값 표준화 (answer_value/answer_text → numeric)
norm AS (
  SELECT
    a.*,
    CASE
      WHEN a.answer_value IS NOT NULL AND jsonb_typeof(a.answer_value)='number'
        THEN (a.answer_value::text)::numeric
      WHEN a.answer_value IS NOT NULL AND jsonb_typeof(a.answer_value)='string'
        THEN NULLIF(regexp_replace(a.answer_value #>> '{}','[^0-9\.]','','g'),'')::numeric
      WHEN a.answer_text IS NOT NULL
        THEN NULLIF(regexp_replace(a.answer_text,'[^0-9\.]','','g'),'')::numeric
      ELSE NULL
    END AS num_val
  FROM answers a
),
-- 5점 척도 → 10점 환산
scaled AS (
  SELECT
    n.*,
    CASE
      WHEN n.num_val IS NULL THEN NULL
      WHEN n.num_val <= 5 THEN n.num_val * 2
      ELSE n.num_val
    END AS score10
  FROM norm n
),
-- 실제 데이터(테스트 제외) 점수 히스토그램용 집계
real_rating_counts AS (
  SELECT
    s.instructor_id,
    s.education_year, s.education_round, s.course_name,
    s.survey_is_test, s.status,
    s.score10::int AS score_key,
    COUNT(*) AS cnt
  FROM scaled s
  WHERE s.response_is_test = false
    AND s.question_type IN ('scale','rating')
    AND s.score10 IS NOT NULL
  GROUP BY 1,2,3,4,5,6,7
),
-- 테스트 데이터 점수 히스토그램용 집계
test_rating_counts AS (
  SELECT
    s.instructor_id,
    s.education_year, s.education_round, s.course_name,
    s.survey_is_test, s.status,
    s.score10::int AS score_key,
    COUNT(*) AS cnt
  FROM scaled s
  WHERE s.response_is_test = true
    AND s.question_type IN ('scale','rating')
    AND s.score10 IS NOT NULL
  GROUP BY 1,2,3,4,5,6,7
),
-- 문항별 평균(실데이터)
real_question_avgs AS (
  SELECT
    s.instructor_id,
    s.education_year, s.education_round, s.course_name,
    s.question_text, s.question_type, s.satisfaction_type,
    AVG(s.score10) AS avg_score
  FROM scaled s
  WHERE s.response_is_test = false
    AND s.question_type IN ('scale','rating')
  GROUP BY 1,2,3,4,5,6,7
),
-- 문항별 평균(테스트)
test_question_avgs AS (
  SELECT
    s.instructor_id,
    s.education_year, s.education_round, s.course_name,
    s.question_text, s.question_type, s.satisfaction_type,
    AVG(s.score10) AS avg_score
  FROM scaled s
  WHERE s.response_is_test = true
    AND s.question_type IN ('scale','rating')
  GROUP BY 1,2,3,4,5,6,7
)
SELECT
  s.instructor_id,
  i.name AS instructor_name,
  s.education_year,
  s.education_round,
  s.course_name,
  ARRAY_AGG(DISTINCT s.survey_id) AS survey_ids,

  -- 설문/응답 카운트
  COUNT(DISTINCT CASE WHEN COALESCE(s.survey_is_test,false)=false THEN s.survey_id END) AS survey_count,
  COUNT(DISTINCT CASE WHEN COALESCE(s.survey_is_test,false)=true  THEN s.survey_id END) AS test_survey_count,
  COUNT(DISTINCT CASE WHEN COALESCE(s.survey_is_test,false)=false AND s.status='active' THEN s.survey_id END) AS active_survey_count,
  COUNT(DISTINCT CASE WHEN COALESCE(s.survey_is_test,false)=true  AND s.status='active' THEN s.survey_id END) AS test_active_survey_count,

  COUNT(DISTINCT CASE WHEN s.response_is_test=false THEN s.response_id END) AS response_count,
  COUNT(DISTINCT CASE WHEN s.response_is_test=true  THEN s.response_id END) AS test_response_count,

  MAX(s.submitted_at) AS last_response_at,

  BOOL_OR(COALESCE(s.survey_is_test,false))     AS has_test_data,
  BOOL_AND(COALESCE(s.survey_is_test,false))    AS all_test_data,

  -- 만족도 평균 (실데이터)
  AVG(CASE WHEN s.response_is_test=false AND s.satisfaction_type IN ('instructor','course','operation')
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS avg_overall_satisfaction,
  AVG(CASE WHEN s.response_is_test=false AND s.satisfaction_type='course'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS avg_course_satisfaction,
  AVG(CASE WHEN s.response_is_test=false AND s.satisfaction_type='instructor'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS avg_instructor_satisfaction,
  AVG(CASE WHEN s.response_is_test=false AND s.satisfaction_type='operation'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS avg_operation_satisfaction,

  -- 만족도 평균 (테스트)
  AVG(CASE WHEN s.response_is_test=true AND s.satisfaction_type IN ('instructor','course','operation')
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS test_avg_overall_satisfaction,
  AVG(CASE WHEN s.response_is_test=true AND s.satisfaction_type='course'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS test_avg_course_satisfaction,
  AVG(CASE WHEN s.response_is_test=true AND s.satisfaction_type='instructor'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS test_avg_instructor_satisfaction,
  AVG(CASE WHEN s.response_is_test=true AND s.satisfaction_type='operation'
            AND s.question_type IN ('scale','rating') THEN s.score10 END) AS test_avg_operation_satisfaction,

  -- 점수 분포 (키: 점수, 값: 건수)
  (
    SELECT jsonb_object_agg(rc.score_key::text, rc.cnt)
    FROM real_rating_counts rc
    WHERE rc.instructor_id = s.instructor_id
      AND rc.education_year = s.education_year
      AND rc.education_round = s.education_round
      AND rc.course_name = s.course_name
  ) AS rating_distribution,
  (
    SELECT jsonb_object_agg(tc.score_key::text, tc.cnt)
    FROM test_rating_counts tc
    WHERE tc.instructor_id = s.instructor_id
      AND tc.education_year = s.education_year
      AND tc.education_round = s.education_round
      AND tc.course_name = s.course_name
  ) AS test_rating_distribution,

  -- 텍스트 응답
  COUNT(DISTINCT CASE WHEN s.response_is_test=false AND s.question_type IN ('text','textarea','long_text') AND s.answer_text IS NOT NULL THEN s.response_id END) AS text_response_count,
  COUNT(DISTINCT CASE WHEN s.response_is_test=true  AND s.question_type IN ('text','textarea','long_text') AND s.answer_text IS NOT NULL THEN s.response_id END) AS test_text_response_count,
  JSONB_AGG(DISTINCT s.answer_text) FILTER (WHERE s.response_is_test=false AND s.question_type IN ('text','textarea','long_text') AND s.answer_text IS NOT NULL) AS text_responses,
  JSONB_AGG(DISTINCT s.answer_text) FILTER (WHERE s.response_is_test=true  AND s.question_type IN ('text','textarea','long_text') AND s.answer_text IS NOT NULL) AS test_text_responses,

  -- 문항별 평균 집합
  (
    SELECT jsonb_agg(jsonb_build_object(
             'question_text', qa.question_text,
             'question_type', qa.question_type,
             'satisfaction_type', qa.satisfaction_type,
             'avg', qa.avg_score
           ))
    FROM real_question_avgs qa
    WHERE qa.instructor_id   = s.instructor_id
      AND qa.education_year  = s.education_year
      AND qa.education_round = s.education_round
      AND qa.course_name     = s.course_name
  ) AS question_stats,
  (
    SELECT jsonb_agg(jsonb_build_object(
             'question_text', qa.question_text,
             'question_type', qa.question_type,
             'satisfaction_type', qa.satisfaction_type,
             'avg', qa.avg_score
           ))
    FROM test_question_avgs qa
    WHERE qa.instructor_id   = s.instructor_id
      AND qa.education_year  = s.education_year
      AND qa.education_round = s.education_round
      AND qa.course_name     = s.course_name
  ) AS test_question_stats

FROM scaled s
LEFT JOIN public.instructors i ON i.id = s.instructor_id
GROUP BY s.instructor_id, i.name, s.education_year, s.education_round, s.course_name;

-- 권한
GRANT SELECT ON public.instructor_survey_stats TO anon, authenticated, service_role;