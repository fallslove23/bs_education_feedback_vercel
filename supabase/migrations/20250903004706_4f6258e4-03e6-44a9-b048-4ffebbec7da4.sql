-- 익명 사용자도 활성 설문의 강사 정보를 볼 수 있도록 정책 추가
CREATE POLICY "Anyone can view instructors for active surveys"
ON public.instructors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM surveys s 
    WHERE s.instructor_id = instructors.id 
    AND s.status = 'active'
  )
);

-- 익명 사용자도 설문 템플릿 정보를 볼 수 있도록 정책 추가 (활성 설문과 연결된 템플릿만)
CREATE POLICY "Anyone can view templates for active surveys"
ON public.survey_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM surveys s 
    WHERE s.template_id = survey_templates.id 
    AND s.status = 'active'
  )
);