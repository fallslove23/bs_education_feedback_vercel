-- 익명 사용자가 설문 참여할 수 있도록 RLS 정책 추가

-- 1. survey_responses 테이블: 익명 사용자가 응답 생성 가능
DROP POLICY IF EXISTS "Anonymous users can submit survey responses" ON public.survey_responses;
CREATE POLICY "Anonymous users can submit survey responses"
ON public.survey_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  )
);

-- 2. question_answers 테이블: 익명 사용자가 답변 생성 가능
DROP POLICY IF EXISTS "Anonymous users can submit answers" ON public.question_answers;
CREATE POLICY "Anonymous users can submit answers"
ON public.question_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  response_id IN (
    SELECT sr.id FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE s.status IN ('active', 'public')
    AND (s.start_date IS NULL OR s.start_date <= now())
    AND (s.end_date IS NULL OR s.end_date >= now())
  )
);

-- 3. surveys 테이블: 익명 사용자가 active/public 설문 조회 가능
DROP POLICY IF EXISTS "Anonymous users can view active surveys" ON public.surveys;
CREATE POLICY "Anonymous users can view active surveys"
ON public.surveys
FOR SELECT
TO anon, authenticated
USING (
  status IN ('active', 'public')
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

-- 4. survey_sessions 테이블: 익명 사용자가 active 설문의 세션 조회 가능
DROP POLICY IF EXISTS "Anonymous users can view sessions for active surveys" ON public.survey_sessions;
CREATE POLICY "Anonymous users can view sessions for active surveys"
ON public.survey_sessions
FOR SELECT
TO anon, authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  )
);

-- 5. survey_sections 테이블: 익명 사용자가 active 설문의 섹션 조회 가능
DROP POLICY IF EXISTS "Anonymous users can view sections for active surveys" ON public.survey_sections;
CREATE POLICY "Anonymous users can view sections for active surveys"
ON public.survey_sections
FOR SELECT
TO anon, authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  )
);

-- 6. survey_completions 테이블 정책은 이미 존재하므로 확인만
-- "Anyone can track completions" 정책이 이미 있음

NOTIFY pgrst, 'reload schema';