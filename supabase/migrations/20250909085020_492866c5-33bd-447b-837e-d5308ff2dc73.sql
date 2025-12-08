-- 설문 응답 테이블에 대한 공개 삽입 정책 개선
DROP POLICY IF EXISTS "Public can submit survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Public: insert responses for active surveys" ON public.survey_responses;

-- 새로운 설문 응답 삽입 정책 (더 관대한 정책)
CREATE POLICY "Anyone can submit survey responses" 
ON public.survey_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys s 
    WHERE s.id = survey_responses.survey_id 
    AND s.status IN ('active', 'public')
  )
);

-- 질문 답변 테이블에 대한 공개 삽입 정책 개선  
DROP POLICY IF EXISTS "Public can submit question answers" ON public.question_answers;
DROP POLICY IF EXISTS "Public: insert answers for valid response" ON public.question_answers;

-- 새로운 질문 답변 삽입 정책 (더 관대한 정책)
CREATE POLICY "Anyone can submit question answers"
ON public.question_answers
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE sr.id = question_answers.response_id 
    AND s.status IN ('active', 'public')
  )
);

-- 설문 완료 추적을 위한 정책 개선
DROP POLICY IF EXISTS "Public can track completions" ON public.survey_completions;

CREATE POLICY "Anyone can track completions" 
ON public.survey_completions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);