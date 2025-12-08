-- 기존 역할 시스템 개선: 강사/운영자/관리자/조직장 4개 역할과 중복 역할 지원

-- 1. 새로운 역할 enum 생성
CREATE TYPE public.user_role AS ENUM ('instructor', 'operator', 'admin', 'director');

-- 2. 사용자 역할 매핑 테이블 생성 (중복 역할 지원)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. RLS 정책 설정
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 역할을 볼 수 있도록
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 모든 역할을 관리할 수 있도록
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 4. 기존 profiles 테이블의 데이터를 새 시스템으로 마이그레이션
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role = 'admin' THEN 'admin'::public.user_role
    WHEN role = 'instructor' THEN 'instructor'::public.user_role
    ELSE 'operator'::public.user_role
  END
FROM public.profiles 
WHERE role IS NOT NULL;

-- 5. 역할 확인 함수들 업데이트
CREATE OR REPLACE FUNCTION public.has_role(check_role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('admin'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('instructor'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('operator'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('director'::public.user_role);
$$;

-- 6. 사용자 역할 조회 함수
CREATE OR REPLACE FUNCTION public.get_user_roles(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(role public.user_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;
$$;

-- 7. 기존 trigger 함수 업데이트 (새 사용자 생성 시 기본 역할 부여)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  instructor_record record;
BEGIN
  -- 안전하게 instructor 확인
  BEGIN
    SELECT * INTO instructor_record 
    FROM public.instructors 
    WHERE email = NEW.email;
  EXCEPTION
    WHEN OTHERS THEN
      instructor_record := NULL;
  END;
  
  -- profiles 테이블에 안전하게 insert
  BEGIN
    IF instructor_record.id IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, role, instructor_id, first_login)
      VALUES (NEW.id, NEW.email, 'instructor', instructor_record.id, true);
      
      -- 새로운 역할 시스템에도 추가
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'instructor'::public.user_role);
    ELSE
      INSERT INTO public.profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'operator');
      
      -- 새로운 역할 시스템에도 추가 (기본: operator)
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'operator'::public.user_role);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- 오류 로그만 남기고 사용자 생성은 계속 진행
      RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;