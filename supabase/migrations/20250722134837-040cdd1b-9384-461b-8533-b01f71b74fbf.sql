-- Add new roles to profiles table constraints
-- First check if we need to update the role constraint
-- Add new roles: director (연구소장), team_leader (팀장)
-- Update the check constraint to include new roles

-- Drop the existing check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new check constraint with additional roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'instructor'::text, 'user'::text, 'director'::text, 'team_leader'::text]));

-- Create a comment to document the roles
COMMENT ON COLUMN public.profiles.role IS 'User role: admin, manager, instructor, user, director (연구소장), team_leader (팀장)';

-- Update RLS policies to include new roles for survey management
-- Update survey policies to allow directors and team leaders to view all surveys
DROP POLICY IF EXISTS "Directors and team leaders can view all surveys" ON public.surveys;
CREATE POLICY "Directors and team leaders can view all surveys" 
ON public.surveys 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update survey responses policies
DROP POLICY IF EXISTS "Directors and team leaders can view all responses" ON public.survey_responses;
CREATE POLICY "Directors and team leaders can view all responses" 
ON public.survey_responses 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update question answers policies
DROP POLICY IF EXISTS "Directors and team leaders can view all answers" ON public.question_answers;
CREATE POLICY "Directors and team leaders can view all answers" 
ON public.question_answers 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update instructors table policies
DROP POLICY IF EXISTS "Directors and team leaders can manage instructors" ON public.instructors;
CREATE POLICY "Directors and team leaders can manage instructors" 
ON public.instructors 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update courses table policies
DROP POLICY IF EXISTS "Directors and team leaders can manage courses" ON public.courses;
CREATE POLICY "Directors and team leaders can manage courses" 
ON public.courses 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update instructor_courses table policies
DROP POLICY IF EXISTS "Directors and team leaders can manage instructor courses" ON public.instructor_courses;
CREATE POLICY "Directors and team leaders can manage instructor courses" 
ON public.instructor_courses 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update survey templates policies
DROP POLICY IF EXISTS "Directors and team leaders can manage templates" ON public.survey_templates;
CREATE POLICY "Directors and team leaders can manage templates" 
ON public.survey_templates 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update template sections policies
DROP POLICY IF EXISTS "Directors and team leaders can manage template sections" ON public.template_sections;
CREATE POLICY "Directors and team leaders can manage template sections" 
ON public.template_sections 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update template questions policies
DROP POLICY IF EXISTS "Directors and team leaders can manage template questions" ON public.template_questions;
CREATE POLICY "Directors and team leaders can manage template questions" 
ON public.template_questions 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update survey sections policies
DROP POLICY IF EXISTS "Directors and team leaders can manage survey sections" ON public.survey_sections;
CREATE POLICY "Directors and team leaders can manage survey sections" 
ON public.survey_sections 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));

-- Update survey questions policies
DROP POLICY IF EXISTS "Directors and team leaders can manage survey questions" ON public.survey_questions;
CREATE POLICY "Directors and team leaders can manage survey questions" 
ON public.survey_questions 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'manager'::text, 'director'::text, 'team_leader'::text])))));