-- Create missing helper and align authorization: admin OR operator have full rights for role admin RPCs

-- 1) Create is_admin() helper using existing has_role(role user_role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('admin'::public.user_role);
$$;

-- 2) Update admin_set_user_roles to allow operator as well
CREATE OR REPLACE FUNCTION public.admin_set_user_roles(target_user_id uuid, roles user_role[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Ensure admins OR operators can call this
  IF NOT (public.is_admin() OR public.is_operator()) THEN
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
$function$;

-- 3) Update admin_set_user_roles_safe similarly (keeps existence check)
CREATE OR REPLACE FUNCTION public.admin_set_user_roles_safe(target_user_id uuid, roles user_role[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- 관리자/운영자 권한 확인
  IF NOT (public.is_admin() OR public.is_operator()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- auth.users에 실제 존재하는 사용자인지 확인
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;

  -- 기존 역할 삭제
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- 새 역할 추가
  IF array_length(roles, 1) IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT target_user_id, r FROM unnest(roles) AS r;
  END IF;
END;
$function$;