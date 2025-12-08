-- Allow admins to link a profile to an instructor safely (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_link_profile_to_instructor(target_profile_id uuid, instructor_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET instructor_id = instructor_id_param,
      updated_at = now()
  WHERE id = target_profile_id;
END;
$$;