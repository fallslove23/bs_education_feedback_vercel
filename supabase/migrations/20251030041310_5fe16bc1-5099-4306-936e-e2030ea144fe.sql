
-- Fix infinite recursion in RLS policies with correct schema and roles

-- Create security definer helper functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_instructor_for_survey(survey_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.instructor_id IN (
        SELECT instructor_id 
        FROM survey_sessions 
        WHERE survey_id = survey_id_param
        UNION
        SELECT instructor_id 
        FROM surveys 
        WHERE id = survey_id_param
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'operator'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = role_name::user_role
  );
$$;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Instructors can view their own survey sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Instructors can view their surveys" ON surveys;
DROP POLICY IF EXISTS "Users can view survey responses for their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Public can view active surveys" ON surveys;
DROP POLICY IF EXISTS "Public can view survey sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Admins can view all surveys" ON surveys;
DROP POLICY IF EXISTS "Managers can view all surveys" ON surveys;
DROP POLICY IF EXISTS "Admins can view all survey_sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Managers can view all survey_sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Admins can view all responses" ON survey_responses;
DROP POLICY IF EXISTS "Managers can view all responses" ON survey_responses;
DROP POLICY IF EXISTS "Operators can view all surveys" ON surveys;
DROP POLICY IF EXISTS "Directors can view all surveys" ON surveys;
DROP POLICY IF EXISTS "Operators can view all survey_sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Directors can view all survey_sessions" ON survey_sessions;
DROP POLICY IF EXISTS "Operators can view all responses" ON survey_responses;
DROP POLICY IF EXISTS "Directors can view all responses" ON survey_responses;

-- Recreate survey_sessions policies (simple, no recursion)
CREATE POLICY "Admins can view all survey_sessions"
ON survey_sessions FOR SELECT
USING (public.is_admin());

CREATE POLICY "Operators and Directors can view all survey_sessions"
ON survey_sessions FOR SELECT
USING (public.is_operator() OR public.is_director());

CREATE POLICY "Instructors can view their own survey sessions"
ON survey_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND instructor_id = survey_sessions.instructor_id
  )
);

-- Recreate surveys policies (using helper function)
CREATE POLICY "Admins can view all surveys"
ON surveys FOR SELECT
USING (public.is_admin());

CREATE POLICY "Operators and Directors can view all surveys"
ON surveys FOR SELECT
USING (public.is_operator() OR public.is_director());

CREATE POLICY "Instructors can view their surveys"
ON surveys FOR SELECT
USING (public.is_instructor_for_survey(surveys.id));

-- Recreate survey_responses policies
CREATE POLICY "Admins can view all responses"
ON survey_responses FOR SELECT
USING (public.is_admin());

CREATE POLICY "Operators and Directors can view all responses"
ON survey_responses FOR SELECT
USING (public.is_operator() OR public.is_director());

CREATE POLICY "Instructors can view responses for their surveys"
ON survey_responses FOR SELECT
USING (public.is_instructor_for_survey(survey_responses.survey_id));
