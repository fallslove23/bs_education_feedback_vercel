-- Update RLS policies to include manager role with admin privileges

-- Drop existing policies and recreate with manager included
DROP POLICY IF EXISTS "Admins can manage surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can view responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can view answers" ON public.question_answers;
DROP POLICY IF EXISTS "Admins can manage survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can manage survey sections" ON public.survey_sections;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;
DROP POLICY IF EXISTS "Admins can manage instructor courses" ON public.instructor_courses;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Admins can manage template questions" ON public.template_questions;
DROP POLICY IF EXISTS "Admins can manage template sections" ON public.template_sections;

-- Create new policies that include both admin and manager roles
CREATE POLICY "Admins and managers can manage surveys" 
ON public.surveys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can view responses" 
ON public.survey_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can view answers" 
ON public.question_answers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage survey questions" 
ON public.survey_questions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage survey sections" 
ON public.survey_sections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage courses" 
ON public.courses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage instructors" 
ON public.instructors 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage instructor courses" 
ON public.instructor_courses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage templates" 
ON public.survey_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage template questions" 
ON public.template_questions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and managers can manage template sections" 
ON public.template_sections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'manager')
));