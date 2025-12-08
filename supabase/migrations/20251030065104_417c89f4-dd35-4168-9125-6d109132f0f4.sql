-- survey_sessions 테이블에 subject_id 컬럼 추가
-- 이 컬럼이 있으면 SessionManager에서 직접 subject를 참조 가능

-- 1. subject_id 컬럼 추가 (nullable, 나중에 백필)
ALTER TABLE public.survey_sessions
ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 2. 기존 데이터 백필: session_id → session_subjects → subject_id 경로로 채우기
-- survey_sessions에 session_id가 있는 경우, 해당 세션의 첫 번째 subject를 가져와 채움
UPDATE public.survey_sessions ss
SET subject_id = (
  SELECT subs.subject_id
  FROM public.session_subjects subs
  WHERE subs.session_id = ss.session_id
  LIMIT 1
)
WHERE ss.session_id IS NOT NULL
  AND ss.subject_id IS NULL;

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_survey_sessions_subject_id 
ON public.survey_sessions(subject_id);

-- 4. PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';