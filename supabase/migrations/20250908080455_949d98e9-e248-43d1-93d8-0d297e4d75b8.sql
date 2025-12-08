-- survey_questions 테이블에 인증된 사용자가 질문을 삽입할 수 있도록 정책 추가
CREATE POLICY "Authenticated users can insert survey questions" 
ON public.survey_questions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- survey_sections 테이블에도 동일한 정책 추가 
CREATE POLICY "Authenticated users can insert survey sections" 
ON public.survey_sections 
FOR INSERT 
TO authenticated 
WITH CHECK (true);