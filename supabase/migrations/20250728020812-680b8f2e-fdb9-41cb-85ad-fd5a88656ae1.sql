-- Security Fix Migration: Critical RLS and Privilege Escalation Prevention (Fixed)

-- 1. CRITICAL: Enable RLS on instructors table and create proper policies
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policy and create proper role-based policies
DROP POLICY IF EXISTS "Instructors can view own info" ON public.instructors;

CREATE POLICY "Admins can manage all instructors" 
ON public.instructors 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view own profile" 
ON public.instructors 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. CRITICAL: Add missing RLS policies for courses table
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all courses" 
ON public.courses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view assigned courses" 
ON public.courses 
FOR SELECT 
USING (id IN (
  SELECT course_id FROM public.instructor_courses ic
  JOIN public.profiles p ON p.instructor_id = ic.instructor_id
  WHERE p.id = auth.uid()
));

-- 3. CRITICAL: Add RLS policies for instructor_courses table
ALTER TABLE public.instructor_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage instructor course assignments" 
ON public.instructor_courses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view own course assignments" 
ON public.instructor_courses 
FOR SELECT 
USING (instructor_id IN (
  SELECT instructor_id FROM public.profiles 
  WHERE id = auth.uid()
));

-- 4. CRITICAL: Add RLS policies for survey_templates table
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all templates" 
ON public.survey_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view templates" 
ON public.survey_templates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'instructor')
));

-- 5. CRITICAL: Add RLS policies for template_sections table
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template sections" 
ON public.template_sections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view template sections" 
ON public.template_sections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'instructor')
));

-- 6. CRITICAL: Add RLS policies for template_questions table
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template questions" 
ON public.template_questions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view template questions" 
ON public.template_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('admin', 'instructor')
));

-- 7. CRITICAL: Fix privilege escalation - Secure profiles table role updates
DROP POLICY IF EXISTS "Users can update own profile excluding role" ON public.profiles;

-- Create a security definer function to check if role change is allowed
CREATE OR REPLACE FUNCTION public.check_role_change_allowed(user_id uuid, new_role text, old_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    old_role = new_role OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = user_id AND role = 'admin'
    );
$$;

-- Create separate policies for profile updates
CREATE POLICY "Users can update own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  public.check_role_change_allowed(auth.uid(), role, (SELECT role FROM public.profiles WHERE id = auth.uid()))
);

-- 8. CRITICAL: Enhance survey management RLS
CREATE POLICY "Admins can manage all surveys" 
ON public.surveys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view own surveys" 
ON public.surveys 
FOR SELECT 
USING (
  status = 'active' OR 
  instructor_id IN (
    SELECT instructor_id FROM public.profiles 
    WHERE id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 9. CRITICAL: Secure survey questions access
CREATE POLICY "Admins can manage survey questions" 
ON public.survey_questions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 10. CRITICAL: Secure survey sections access
CREATE POLICY "Admins can manage survey sections" 
ON public.survey_sections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 11. Add admin-only response viewing
CREATE POLICY "Admins can view all survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view responses to their surveys" 
ON public.survey_responses 
FOR SELECT 
USING (survey_id IN (
  SELECT s.id FROM public.surveys s
  JOIN public.profiles p ON p.instructor_id = s.instructor_id
  WHERE p.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 12. Add admin-only answer viewing
CREATE POLICY "Admins can view all question answers" 
ON public.question_answers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Instructors can view answers to their survey questions" 
ON public.question_answers 
FOR SELECT 
USING (response_id IN (
  SELECT sr.id FROM public.survey_responses sr
  JOIN public.surveys s ON s.id = sr.survey_id
  JOIN public.profiles p ON p.instructor_id = s.instructor_id
  WHERE p.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 13. CRITICAL: Secure database functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_all_profiles_for_admin(requesting_user_id uuid)
RETURNS TABLE(id uuid, email text, role text, instructor_id uuid, first_login boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.id = requesting_user_id AND pr.role = 'admin'
  );
$function$;