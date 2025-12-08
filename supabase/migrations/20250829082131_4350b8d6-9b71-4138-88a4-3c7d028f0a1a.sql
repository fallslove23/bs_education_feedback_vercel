-- Ensure RLS is enabled (safe to run if already enabled)
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Allow operators (and admins) to manage survey sections
CREATE POLICY IF NOT EXISTS "Operators can manage survey sections"
ON public.survey_sections
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());

-- Allow operators (and admins) to manage survey questions
CREATE POLICY IF NOT EXISTS "Operators can manage survey questions"
ON public.survey_questions
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());

-- Allow operators (and admins) to manage courses (fixes RLS error seen in logs)
CREATE POLICY IF NOT EXISTS "Operators can manage courses"
ON public.courses
FOR ALL
USING (public.is_operator() OR public.is_admin())
WITH CHECK (public.is_operator() OR public.is_admin());