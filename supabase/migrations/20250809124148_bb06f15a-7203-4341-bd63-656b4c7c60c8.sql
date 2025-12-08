-- 안전한 역할 업데이트: auth.users에 실제 존재하는 사용자만 대상으로 함
CREATE OR REPLACE FUNCTION public.admin_set_user_roles_safe(target_user_id uuid, roles public.user_role[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT public.is_admin() THEN
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
$$;