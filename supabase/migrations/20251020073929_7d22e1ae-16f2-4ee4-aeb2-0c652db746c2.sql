-- 세션(과정) 필터 옵션을 반환하는 RPC 함수 생성
-- 사용자가 선택한 연도에 해당하는 실제 운영 세션 목록을 반환합니다.
-- 표시 형식: "2025년 5차 BS Advanced"

CREATE OR REPLACE FUNCTION public.rpc_session_filter_options(
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  value uuid,           -- session_id
  label text,           -- "연도년 회차차 프로그램명"
  program_name text,    -- 프로그램명
  year integer,         -- 연도
  turn integer          -- 회차
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT
    se.id AS value,
    (se.year::text || '년 ' || 
     COALESCE(se.turn::text || '차 ', '') || 
     pg.name) AS label,
    pg.name AS program_name,
    se.year,
    se.turn
  FROM public.surveys s
  JOIN public.sessions se ON se.id = s.session_id
  JOIN public.programs pg ON pg.id = se.program_id
  WHERE (p_year IS NULL OR se.year = p_year)
    AND COALESCE(s.is_test, false) = false
  ORDER BY se.year DESC, se.turn DESC NULLS LAST, pg.name ASC;
$$;

-- RLS 정책: 모든 인증된 사용자가 함수를 실행할 수 있도록 허용
COMMENT ON FUNCTION public.rpc_session_filter_options IS '설문 관리 페이지의 세션(과정) 필터 옵션 제공';
