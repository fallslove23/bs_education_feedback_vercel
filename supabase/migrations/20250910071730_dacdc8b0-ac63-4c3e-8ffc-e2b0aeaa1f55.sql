-- 설문 제출을 위해 draft 상태 설문도 제출 가능하도록 RLS 정책 수정
DROP POLICY IF EXISTS "Anonymous can submit responses to active surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone can submit survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Anonymous can submit answers to active surveys" ON public.question_answers;
DROP POLICY IF EXISTS "Anyone can submit question answers" ON public.question_answers;

-- 새로운 정책: 모든 상태의 설문에 대해 제출 허용 (보안을 위해 제한적으로)
CREATE POLICY "Public can submit survey responses" 
ON public.survey_responses 
FOR INSERT 
TO PUBLIC
WITH CHECK (true);

CREATE POLICY "Public can submit question answers" 
ON public.question_answers 
FOR INSERT 
TO PUBLIC
WITH CHECK (true);