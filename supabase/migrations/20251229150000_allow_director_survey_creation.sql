-- Allow directors (Team Managers) to create/update/delete surveys and related items
-- This updates policies created in previous migrations (e.g. 20251104060304)

-- 1. Surveys Table
-- Drop existing restrictive INSERT/UPDATE/DELETE policies that only allowed admin/operator
DROP POLICY IF EXISTS "Admin and operators can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can delete surveys" ON public.surveys;

-- Create new policies including 'director' role
CREATE POLICY "Admin, operators, and directors can insert surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);

CREATE POLICY "Admin, operators, and directors can update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);

CREATE POLICY "Admin, operators, and directors can delete surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);

-- Ensure they can also view the surveys (SELECT)
CREATE POLICY "Admin, operators, and directors can view surveys"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);

-- 2. Survey Questions Table
CREATE POLICY "Admin, operators, and directors can manage survey_questions"
ON public.survey_questions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);

-- 3. Survey Sections Table
CREATE POLICY "Admin, operators, and directors can manage survey_sections"
ON public.survey_sections
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role) OR
  public.has_role(auth.uid(), 'director'::public.user_role)
);
