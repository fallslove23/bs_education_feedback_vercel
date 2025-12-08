-- Tighten instructors table SELECT permissions to prevent email leakage
-- 1) Drop overly permissive policy
DROP POLICY IF EXISTS "Instructors can view all instructor profiles" ON public.instructors;

-- 2) Allow only privileged roles to view all instructors
CREATE POLICY "Privileged users can view instructors"
ON public.instructors
FOR SELECT
USING (public.is_admin() OR public.is_operator() OR public.is_director());

-- 3) Allow an instructor to view only their own instructor record (linked via profiles)
CREATE POLICY "Instructors can view own profile"
ON public.instructors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.instructor_id = public.instructors.id
  )
);
