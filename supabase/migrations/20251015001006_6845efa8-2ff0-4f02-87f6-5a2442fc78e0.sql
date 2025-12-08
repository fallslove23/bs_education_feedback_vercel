-- 과정×강사 필터 + 설문목록 + 만족도 집계 통합 뷰

BEGIN;

-- 안전: 기존 뷰 제거 (CASCADE로 의존 뷰도 함께 삭제)
DROP VIEW IF EXISTS public.v_course_instructor_stats CASCADE;
DROP VIEW IF EXISTS public.v_course_instructor_surveys CASCADE;
DROP VIEW IF EXISTS public.v_course_instructor_filter_options CASCADE;
DROP VIEW IF EXISTS public.v_session_instructors CASCADE;
DROP VIEW IF EXISTS public.v_session_course_canonical CASCADE;

------------------------------------------------------------------------------
-- 1) 세션별 "정규 과정" (과목 배제, 과정 전용 키=텍스트)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_session_course_canonical AS
WITH base AS (
  SELECT
    s.id                         AS survey_id,
    s.id                         AS session_key,
    s.id                         AS session_id,
    s.title                      AS survey_title,
    s.course_name                AS survey_course_name,
    s.created_at                 AS survey_created_at,
    c.title                      AS fk_course_title
  FROM public.surveys s
  LEFT JOIN public.courses c ON c.id = s.course_id
),
title_pick AS (
  SELECT
    b.survey_id,
    CASE
      WHEN b.survey_title ~* 'BS\s*Basic'            THEN 'BS Basic'
      WHEN b.survey_title ~* 'BS\s*Advanced'         THEN 'BS Advanced'
      WHEN b.survey_title ~* 'BS\s*이해'              THEN 'BS 이해'
      WHEN b.survey_title ~* '장비\s*심화'             THEN 'BS 장비 심화 교육'
      WHEN b.survey_title ~* '영업\s*BS'              THEN '영업 BS 집체교육'
      ELSE NULL
    END AS rx_course_key
  FROM base b
),
name_norm AS (
  SELECT
    b.survey_id,
    NULLIF(TRIM(b.survey_course_name), '') AS nm_course_key
  FROM base b
),
pick AS (
  SELECT
    b.session_key,
    b.session_id,
    b.survey_id,
    COALESCE(tp.rx_course_key, nn.nm_course_key, b.fk_course_title) AS course_key
  FROM base b
  LEFT JOIN title_pick tp ON tp.survey_id = b.survey_id
  LEFT JOIN name_norm  nn ON nn.survey_id = b.survey_id
),
session_pick AS (
  SELECT
    p.session_key,
    p.session_id,
    p.course_key,
    COUNT(*) AS n,
    ROW_NUMBER() OVER (PARTITION BY p.session_key ORDER BY COUNT(*) DESC, p.course_key) AS rn
  FROM pick p
  GROUP BY p.session_key, p.session_id, p.course_key
),
session_year AS (
  SELECT
    s.id AS session_key,
    COALESCE(
      MIN(EXTRACT(YEAR FROM r.submitted_at))::int,
      MIN(EXTRACT(YEAR FROM s.created_at))::int
    ) AS year
  FROM public.surveys s
  LEFT JOIN public.survey_responses r ON r.survey_id = s.id
  GROUP BY s.id
)
SELECT
  sp.session_id,
  sp.session_key,
  sp.course_key,
  sy.year
FROM session_pick sp
JOIN session_year sy ON sy.session_key = sp.session_key
WHERE sp.rn = 1
  AND sp.course_key IS NOT NULL;

GRANT SELECT ON public.v_session_course_canonical TO authenticated, anon;

------------------------------------------------------------------------------
-- 2) 세션별 "강사" 매핑 (survey_instructors 테이블 활용)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_session_instructors AS
WITH base AS (
  SELECT
    s.id AS session_key,
    s.id AS session_id,
    s.id AS survey_id,
    s.instructor_id
  FROM public.surveys s
  WHERE s.instructor_id IS NOT NULL
  
  UNION ALL
  
  SELECT
    s.id AS session_key,
    s.id AS session_id,
    s.id AS survey_id,
    si.instructor_id
  FROM public.surveys s
  JOIN public.survey_instructors si ON si.survey_id = s.id
)
SELECT DISTINCT
  b.session_key,
  b.session_id,
  b.survey_id,
  i.id   AS instructor_id,
  i.name AS instructor_name
FROM base b
JOIN public.instructors i ON i.id = b.instructor_id;

GRANT SELECT ON public.v_session_instructors TO authenticated, anon;

------------------------------------------------------------------------------
-- 3) 과정×강사 "필터" 옵션 (연도별/중복제거)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_course_instructor_filter_options AS
SELECT DISTINCT
  c.year,
  c.course_key,
  i.instructor_id,
  i.instructor_name
FROM public.v_session_course_canonical c
JOIN public.v_session_instructors i
  ON i.session_key = c.session_key
WHERE c.course_key IS NOT NULL
  AND i.instructor_id IS NOT NULL;

GRANT SELECT ON public.v_course_instructor_filter_options TO authenticated, anon;

------------------------------------------------------------------------------
-- 4) 과정×강사로 "설문 목록" (프론트 바로 바인딩용)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_course_instructor_surveys AS
SELECT
  c.year,
  c.course_key,
  i.instructor_id,
  i.instructor_name,
  s.id         AS survey_id,
  s.title      AS survey_title,
  s.id         AS session_id,
  s.created_at,
  s.education_year,
  s.education_round,
  NULLIF(REGEXP_REPLACE(s.title, '.*?([0-9]+)\s*일차.*', '\1'), s.title)::int AS day_no
FROM public.v_session_course_canonical c
JOIN public.v_session_instructors i
  ON i.session_key = c.session_key
JOIN public.surveys s
  ON s.id = c.session_key;

GRANT SELECT ON public.v_course_instructor_surveys TO authenticated, anon;

------------------------------------------------------------------------------
-- 5) 과정×강사 만족도 기초 집계 (question_answers 활용)
------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_course_instructor_stats AS
WITH resp AS (
  SELECT
    cis.year,
    cis.course_key,
    cis.instructor_id,
    cis.instructor_name,
    r.survey_id,
    r.id AS response_id
  FROM public.v_course_instructor_surveys cis
  JOIN public.survey_responses r ON r.survey_id = cis.survey_id
),
answers AS (
  SELECT
    r.year,
    r.course_key,
    r.instructor_id,
    r.instructor_name,
    r.survey_id,
    qa.question_id,
    sq.satisfaction_type,
    sq.question_type,
    CASE 
      WHEN qa.answer_value IS NOT NULL AND jsonb_typeof(qa.answer_value) = 'number'
        THEN (qa.answer_value::text)::numeric
      WHEN qa.answer_text ~ '^[0-9]+\.?[0-9]*$'
        THEN qa.answer_text::numeric
      ELSE NULL
    END AS score
  FROM resp r
  JOIN public.question_answers qa ON qa.response_id = r.response_id
  JOIN public.survey_questions sq ON sq.id = qa.question_id
  WHERE sq.question_type IN ('scale', 'rating')
)
SELECT
  year,
  course_key,
  instructor_id,
  instructor_name,
  COUNT(*) FILTER (WHERE score IS NOT NULL) AS n_answers,
  ROUND(AVG(score)::numeric, 2) AS avg_score,
  ROUND(AVG(score) FILTER (WHERE satisfaction_type = 'instructor')::numeric, 2) AS avg_instructor_satisfaction,
  ROUND(AVG(score) FILTER (WHERE satisfaction_type = 'course')::numeric, 2) AS avg_course_satisfaction,
  ROUND(AVG(score) FILTER (WHERE satisfaction_type = 'operation')::numeric, 2) AS avg_operation_satisfaction,
  MIN(score) AS min_score,
  MAX(score) AS max_score
FROM answers
WHERE score IS NOT NULL
GROUP BY year, course_key, instructor_id, instructor_name;

GRANT SELECT ON public.v_course_instructor_stats TO authenticated, anon;

COMMIT;