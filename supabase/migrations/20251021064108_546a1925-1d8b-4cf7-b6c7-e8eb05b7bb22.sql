-- Add RLS policies for subjects table management
-- Allow admins and operators to insert, update, and delete subjects

-- Insert policy
CREATE POLICY "Admins and operators can insert subjects"
ON public.subjects
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR is_operator()
);

-- Update policy  
CREATE POLICY "Admins and operators can update subjects"
ON public.subjects
FOR UPDATE
TO authenticated
USING (
  is_admin() OR is_operator()
)
WITH CHECK (
  is_admin() OR is_operator()
);

-- Delete policy
CREATE POLICY "Admins and operators can delete subjects"
ON public.subjects
FOR DELETE
TO authenticated
USING (
  is_admin() OR is_operator()
);