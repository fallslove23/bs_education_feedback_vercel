-- Create helper function to set user roles atomically with admin privileges
CREATE OR REPLACE FUNCTION public.admin_set_user_roles(target_user_id uuid, roles public.user_role[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Ensure only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Replace all roles for the target user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insert new roles if provided
  IF array_length(roles, 1) IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT target_user_id, r FROM unnest(roles) AS r;
  END IF;
END;
$$;