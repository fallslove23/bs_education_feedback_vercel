-- Check surveys table RLS policies and fix operator role issues

-- First check current policies (this query will show existing policies)
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'surveys';

-- Check if we need to add operator role to surveys creation policy
-- Current policy only allows admin, but operator should also be able to create surveys
DROP POLICY IF EXISTS "Allow admins to manage all surveys" ON public.surveys;

-- Create new policy that allows both admin and operator to manage surveys
CREATE POLICY "Allow admins and operators to manage all surveys" ON public.surveys
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- Ensure operator role has proper survey viewing permissions
-- Update existing view policy to include operators
DROP POLICY IF EXISTS "Allow instructors to view their surveys" ON public.surveys;

CREATE POLICY "Allow instructors and operators to view surveys" ON public.surveys
FOR SELECT 
USING (
  (status = 'active'::text) OR 
  is_admin() OR 
  is_operator() OR 
  is_director() OR 
  (is_instructor() AND (instructor_id IN (
    SELECT profiles.instructor_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )))
);