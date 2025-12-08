-- Secure RPC: get_user_profile to prevent unauthorized access
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  instructor_id uuid,
  first_login boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.id = user_id
    AND (auth.uid() = user_id OR public.is_admin());
$function$;

-- Harden get_all_profiles_for_admin: rely on current session, ignore spoofable param
CREATE OR REPLACE FUNCTION public.get_all_profiles_for_admin(requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  instructor_id uuid,
  first_login boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE public.is_admin();
$function$;