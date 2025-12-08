-- Security Fix Migration: Critical RLS and Privilege Escalation Prevention

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

-- Create separate policies for role and non-role updates
CREATE POLICY "Users can update own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent role changes by regular users
  (OLD.role = NEW.role OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ))
);

-- Admin-only role management policy
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

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
  -- Only return data if the requesting user is an admin
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.id = requesting_user_id AND pr.role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_instructor_account(instructor_email text, instructor_password text, instructor_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  existing_profile_id uuid;
  requesting_user_role text;
BEGIN
  -- SECURITY: Verify requesting user is admin
  SELECT role INTO requesting_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF requesting_user_role != 'admin' THEN
    RETURN 'Access denied: Admin privileges required';
  END IF;
  
  -- Validate inputs
  IF instructor_email IS NULL OR instructor_email = '' THEN
    RETURN 'Error: Email is required';
  END IF;
  
  IF instructor_id_param IS NULL THEN
    RETURN 'Error: Instructor ID is required';
  END IF;
  
  -- Check if instructor exists
  IF NOT EXISTS (SELECT 1 FROM public.instructors WHERE id = instructor_id_param) THEN
    RETURN 'Instructor not found';
  END IF;
  
  -- Check if email is already in use
  SELECT id INTO existing_profile_id FROM public.profiles WHERE email = instructor_email;
  
  IF existing_profile_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = existing_profile_id AND instructor_id IS NOT NULL) THEN
      RETURN 'Account already exists for this instructor';
    ELSE
      UPDATE public.profiles 
      SET 
        instructor_id = instructor_id_param,
        role = 'instructor',
        first_login = true,
        updated_at = NOW()
      WHERE id = existing_profile_id;
      
      RETURN 'Existing account linked to instructor';
    END IF;
  END IF;
  
  -- Check if instructor_id is already linked
  IF EXISTS (SELECT 1 FROM public.profiles WHERE instructor_id = instructor_id_param) THEN
    RETURN 'This instructor is already linked to an account';
  END IF;
  
  -- Update instructor email
  UPDATE public.instructors 
  SET email = instructor_email, updated_at = NOW()
  WHERE id = instructor_id_param;
  
  RETURN 'Instructor email updated. Account will be linked upon signup.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_user(admin_email text, admin_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  user_id UUID;
  requesting_user_role text;
BEGIN
  -- SECURITY: Only allow existing admins to create new admins
  SELECT role INTO requesting_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Validate input
  IF admin_email IS NULL OR admin_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO user_id FROM public.profiles WHERE email = admin_email;
  
  IF user_id IS NULL THEN
    user_id := gen_random_uuid();
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (user_id, admin_email, 'admin', NOW(), NOW());
    
    RAISE NOTICE 'Admin profile created for: %', admin_email;
  ELSE
    UPDATE public.profiles 
    SET role = 'admin', updated_at = NOW()
    WHERE email = admin_email;
    
    RAISE NOTICE 'User % updated to admin role', admin_email;
  END IF;
END;
$function$;