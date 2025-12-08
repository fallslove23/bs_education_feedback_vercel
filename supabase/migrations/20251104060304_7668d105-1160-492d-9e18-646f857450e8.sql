-- Fix surveys table RLS policies for admin/operator insert
DROP POLICY IF EXISTS "Admin and operators can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can delete surveys" ON public.surveys;

-- Create improved policies using has_role function
CREATE POLICY "Admin and operators can insert surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role)
);

CREATE POLICY "Admin and operators can update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role)
);

CREATE POLICY "Admin and operators can delete surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role) OR 
  public.has_role(auth.uid(), 'operator'::public.user_role)
);