-- 1) survey_sessions에 subject_id 추가 (없으면)
ALTER TABLE public.survey_sessions
  ADD COLUMN IF NOT EXISTS subject_id uuid;

-- 2) lecture_id 컬럼 추가 (없으면)
ALTER TABLE public.survey_sessions
  ADD COLUMN IF NOT EXISTS lecture_id uuid;

-- 3) course_id 값 중 subjects에 존재하는 것만 subject_id로 복사
UPDATE public.survey_sessions ss
SET subject_id = ss.course_id
WHERE ss.subject_id IS NULL 
  AND ss.course_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.subjects WHERE id = ss.course_id);

-- 4) surveys.subject_id를 우선적으로 subject_id에 복사 (survey와 연결된 경우)
UPDATE public.survey_sessions ss
SET subject_id = s.subject_id
FROM public.surveys s
WHERE ss.survey_id = s.id
  AND ss.subject_id IS NULL
  AND s.subject_id IS NOT NULL;

-- 5) subject_id FK 추가
ALTER TABLE public.survey_sessions
  DROP CONSTRAINT IF EXISTS survey_sessions_subject_fk;
  
ALTER TABLE public.survey_sessions
  ADD CONSTRAINT survey_sessions_subject_fk
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 6) lecture_id FK 추가
ALTER TABLE public.survey_sessions
  DROP CONSTRAINT IF EXISTS survey_sessions_lecture_fk;

ALTER TABLE public.survey_sessions
  ADD CONSTRAINT survey_sessions_lecture_fk
  FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE SET NULL;

-- 7) course_id는 레거시로 유지 (FK 추가 안 함, 나중에 제거 예정)
COMMENT ON COLUMN public.survey_sessions.course_id IS 'Legacy column, use subject_id instead';