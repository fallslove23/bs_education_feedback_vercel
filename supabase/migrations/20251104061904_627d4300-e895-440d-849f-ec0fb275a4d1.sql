-- Create is_operator helper function
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'operator'
  );
$$;

-- Recreate surveys RLS policies with simpler helper functions
DROP POLICY IF EXISTS "Admin and operators can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admin and operators can delete surveys" ON public.surveys;

-- Create new policies using helper functions
CREATE POLICY "Admin and operators can insert surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR public.is_operator()
);

CREATE POLICY "Admin and operators can update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR public.is_operator()
)
WITH CHECK (
  public.is_admin() OR public.is_operator()
);

CREATE POLICY "Admin and operators can delete surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  public.is_admin() OR public.is_operator()
);