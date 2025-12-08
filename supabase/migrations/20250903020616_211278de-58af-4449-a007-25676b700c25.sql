-- 공개 설문 참여를 위해 조회 제약 완화 (IF NOT EXISTS 구문 없이)

-- 기존 제한적 정책들 삭제
DROP POLICY IF EXISTS "Public can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view sections for active surveys" ON public.survey_sections;
DROP POLICY IF EXISTS "Anyone can view questions for active surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Anyone can view templates for active surveys" ON public.survey_templates;
DROP POLICY IF EXISTS "Anyone can view instructors for active surveys" ON public.instructors;

-- surveys: 공개 조회 허용
CREATE POLICY "Public can view all surveys" ON public.surveys
FOR SELECT USING (true);

-- survey_sections: 공개 조회 허용
CREATE POLICY "Public can view all survey sections" ON public.survey_sections
FOR SELECT USING (true);

-- survey_questions: 공개 조회 허용
CREATE POLICY "Public can view all survey questions" ON public.survey_questions
FOR SELECT USING (true);

-- survey_templates: 공개 조회 허용
CREATE POLICY "Public can view all templates" ON public.survey_templates
FOR SELECT USING (true);

-- instructors: 공개 조회 허용
CREATE POLICY "Public can view all instructors" ON public.instructors
FOR SELECT USING (true);