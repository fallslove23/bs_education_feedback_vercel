-- 과정 드롭다운: 연도별로 실제 진행 세션을 "연도+차수+과정명" 라벨로 반환
CREATE OR REPLACE FUNCTION public.rpc_course_filter_options(p_year int)
RETURNS TABLE (
  value uuid,
  label text,
  course_key text,
  year int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      c.session_key,
      c.course_key,
      c.year,
      -- 세션/설문 타이틀에서 "N차" 숫자 뽑기
      NULLIF(regexp_replace(s.title, '.*?([0-9]+)\s*차.*', '\1'), s.title)::int AS turn_no
    FROM public.v_session_course_canonical c
    JOIN public.surveys s ON COALESCE(s.session_id, s.id) = c.session_key
    WHERE c.year = p_year
  ),
  pick AS (
    SELECT DISTINCT ON (session_key)
      session_key,
      course_key,
      year,
      turn_no
    FROM base
    ORDER BY session_key, (turn_no IS NULL), turn_no
  )
  SELECT
    p.session_key AS value,
    TRIM(
      CASE WHEN p.turn_no IS NOT NULL
        THEN p.year || '년 ' || p.turn_no || '차 ' || p.course_key
        ELSE p.year || '년 ' || p.course_key
      END
    ) AS label,
    p.course_key,
    p.year
  FROM pick p
  ORDER BY p.course_key, p.turn_no NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_course_filter_options(int) TO anon, authenticated;

-- 대시보드 요약 지표 RPC
CREATE OR REPLACE FUNCTION public.rpc_dashboard_counts(
  p_year int,
  p_session_key uuid DEFAULT NULL
)
RETURNS TABLE (
  survey_count int,
  respondent_count int,
  instructor_count int,
  avg_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH scope_sessions AS (
    SELECT session_key
    FROM public.v_session_course_canonical
    WHERE year = p_year
      AND (p_session_key IS NULL OR session_key = p_session_key)
  ),
  scoped_surveys AS (
    SELECT s.*
    FROM public.surveys s
    JOIN scope_sessions sc ON sc.session_key = COALESCE(s.session_id, s.id)
  ),
  resp AS (
    SELECT r.*
    FROM public.survey_responses r
    JOIN scoped_surveys ss ON ss.id = r.survey_id
  ),
  instructors AS (
    SELECT DISTINCT i.id
    FROM public.v_session_instructors vsi
    JOIN scope_sessions sc ON sc.session_key = vsi.session_key
    JOIN public.instructors i ON i.id = vsi.instructor_id
  ),
  all_answers AS (
    SELECT qa.answer_value, qa.answer_text
    FROM public.question_answers qa
    JOIN resp r ON r.id = qa.response_id
    JOIN public.survey_questions sq ON sq.id = qa.question_id
    WHERE sq.question_type IN ('scale', 'rating')
  ),
  numeric_scores AS (
    SELECT 
      CASE 
        WHEN jsonb_typeof(answer_value) = 'number' THEN (answer_value::text)::numeric
        WHEN answer_text ~ '^[0-9]+(\.[0-9]+)?$' THEN answer_text::numeric
        ELSE NULL
      END AS score
    FROM all_answers
  )
  SELECT
    (SELECT COUNT(*)::int FROM scoped_surveys) AS survey_count,
    (SELECT COUNT(*)::int FROM resp) AS respondent_count,
    (SELECT COUNT(*)::int FROM instructors) AS instructor_count,
    (SELECT ROUND(AVG(score)::numeric, 2) FROM numeric_scores WHERE score IS NOT NULL) AS avg_score;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_counts(int, uuid) TO anon, authenticated;