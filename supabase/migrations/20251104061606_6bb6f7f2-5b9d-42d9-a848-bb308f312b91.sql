-- Fix surveys table RLS policies with correct type casting
DROP POLICY IF EXISTS "Admin and operators can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can delete surveys" ON public.surveys;

-- Create improved policies with proper type handling
CREATE POLICY "Admin and operators can insert surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admin and operators can update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admin and operators can delete surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'operator')
);