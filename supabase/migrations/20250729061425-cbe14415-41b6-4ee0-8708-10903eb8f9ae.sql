-- Fix RLS policies for better data access

-- Update instructors policies to allow better access
DROP POLICY IF EXISTS "Allow admins to manage all instructors" ON public.instructors;
DROP POLICY IF EXISTS "Allow instructors to view own profile" ON public.instructors;

CREATE POLICY "Admins can manage all instructors"
ON public.instructors
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Instructors can view all instructor profiles"
ON public.instructors
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  public.is_instructor() OR
  auth.uid() IS NOT NULL
);

-- Update courses policies for better access
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can view assigned courses" ON public.courses;

CREATE POLICY "Admins can manage all courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update instructor_courses policies
DROP POLICY IF EXISTS "Admins can manage instructor course assignments" ON public.instructor_courses;
DROP POLICY IF EXISTS "Instructors can view own course assignments" ON public.instructor_courses;

CREATE POLICY "Admins can manage instructor course assignments"
ON public.instructor_courses
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view instructor course assignments"
ON public.instructor_courses
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update survey_templates policies
DROP POLICY IF EXISTS "Admins can manage all templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Instructors can view templates" ON public.survey_templates;

CREATE POLICY "Admins can manage all templates"
ON public.survey_templates
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view templates"
ON public.survey_templates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update template_sections policies
DROP POLICY IF EXISTS "Admins can manage template sections" ON public.template_sections;
DROP POLICY IF EXISTS "Instructors can view template sections" ON public.template_sections;

CREATE POLICY "Admins can manage template sections"
ON public.template_sections
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view template sections"
ON public.template_sections
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update template_questions policies
DROP POLICY IF EXISTS "Admins can manage template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Instructors can view template questions" ON public.template_questions;

CREATE POLICY "Admins can manage template questions"
ON public.template_questions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view template questions"
ON public.template_questions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);