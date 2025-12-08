-- Enable RLS (safe)
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Survey Sections: allow operators to manage
DROP POLICY IF EXISTS "Operators can manage survey sections" ON public.survey_sections;
CREATE POLICY "Operators can manage survey sections"
ON public.survey_sections
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());

-- Survey Questions: allow operators to manage
DROP POLICY IF EXISTS "Operators can manage survey questions" ON public.survey_questions;
CREATE POLICY "Operators can manage survey questions"
ON public.survey_questions
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());

-- Courses: allow operators to manage (fixes RLS error)
DROP POLICY IF EXISTS "Operators can manage courses" ON public.courses;
CREATE POLICY "Operators can manage courses"
ON public.courses
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());