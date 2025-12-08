-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile always" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile data" ON public.profiles;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Create security definer function to check if user is instructor
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'instructor'
  );
$$;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Allow users to view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow admins to view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Allow users to update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update surveys policies to use security definer functions
DROP POLICY IF EXISTS "Admins can manage all surveys" ON public.surveys;
DROP POLICY IF EXISTS "Instructors can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Instructors can view surveys for their courses" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view active surveys" ON public.surveys;

CREATE POLICY "Allow admins to manage all surveys"
ON public.surveys
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow instructors to view their surveys"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  status = 'active' OR 
  public.is_admin() OR 
  (public.is_instructor() AND instructor_id IN (
    SELECT instructor_id FROM public.profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY "Allow anyone to view active surveys"
ON public.surveys
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Update instructors policies
DROP POLICY IF EXISTS "Admins can manage all instructors" ON public.instructors;
DROP POLICY IF EXISTS "Instructors can view own profile by email" ON public.instructors;

CREATE POLICY "Allow admins to manage all instructors"
ON public.instructors
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow instructors to view own profile"
ON public.instructors
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  id IN (SELECT instructor_id FROM public.profiles WHERE id = auth.uid())
);