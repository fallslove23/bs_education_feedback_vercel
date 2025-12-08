-- 공개 설문 참여를 위해 조회 제약 완화

-- surveys: 공개 조회 허용
CREATE POLICY IF NOT EXISTS "Public can view surveys (no restriction)" ON public.surveys
FOR SELECT USING (true);

-- survey_sections: 공개 조회 허용
CREATE POLICY IF NOT EXISTS "Public can view survey sections (no restriction)" ON public.survey_sections
FOR SELECT USING (true);

-- survey_questions: 공개 조회 허용
CREATE POLICY IF NOT EXISTS "Public can view survey questions (no restriction)" ON public.survey_questions
FOR SELECT USING (true);

-- survey_templates: 공개 조회 허용
CREATE POLICY IF NOT EXISTS "Public can view templates (no restriction)" ON public.survey_templates
FOR SELECT USING (true);

-- instructors: 공개 조회 허용
CREATE POLICY IF NOT EXISTS "Public can view instructors (no restriction)" ON public.instructors
FOR SELECT USING (true);