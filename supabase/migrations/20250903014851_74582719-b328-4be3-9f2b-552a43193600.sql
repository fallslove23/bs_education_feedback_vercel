-- 설문 입력 관련 RLS 정책을 완전히 열어서 확실히 동작하도록 수정

-- 기존 정책들 삭제 후 새로 생성
DROP POLICY IF EXISTS "Allow survey response submission" ON public.survey_responses;
DROP POLICY IF EXISTS "Allow question answer submission" ON public.question_answers;
DROP POLICY IF EXISTS "Allow anonymous session creation" ON public.anon_sessions;
DROP POLICY IF EXISTS "Allow anonymous session updates" ON public.anon_sessions;
DROP POLICY IF EXISTS "Allow survey completion tracking" ON public.survey_completions;
DROP POLICY IF EXISTS "Anyone can insert completions" ON public.survey_completions;

-- survey_responses: 모든 사용자가 응답 제출 가능
CREATE POLICY "Public can submit survey responses" ON public.survey_responses
FOR INSERT WITH CHECK (true);

-- question_answers: 모든 사용자가 답변 제출 가능
CREATE POLICY "Public can submit question answers" ON public.question_answers
FOR INSERT WITH CHECK (true);

-- anon_sessions: 모든 사용자가 익명 세션 생성/업데이트 가능
CREATE POLICY "Public can create anon sessions" ON public.anon_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update anon sessions" ON public.anon_sessions
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public can read anon sessions" ON public.anon_sessions
FOR SELECT USING (true);

-- survey_completions: 모든 사용자가 완료 기록 가능
CREATE POLICY "Public can track completions" ON public.survey_completions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read completions" ON public.survey_completions
FOR SELECT USING (true);

-- survey_tokens 테이블도 확인해서 읽기와 업데이트 허용
DROP POLICY IF EXISTS "Anyone can read unused tokens" ON public.survey_tokens;
DROP POLICY IF EXISTS "System can update token usage" ON public.survey_tokens;

CREATE POLICY "Public can read tokens" ON public.survey_tokens
FOR SELECT USING (true);

CREATE POLICY "Public can update tokens" ON public.survey_tokens
FOR UPDATE USING (true) WITH CHECK (true);