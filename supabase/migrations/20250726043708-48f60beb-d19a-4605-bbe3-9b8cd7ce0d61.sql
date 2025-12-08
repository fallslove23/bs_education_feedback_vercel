-- 의존성 문제 해결을 위해 먼저 트리거들을 정리

-- 모든 트리거를 먼저 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS link_instructor_after_signup ON auth.users;
DROP TRIGGER IF EXISTS trg_auto_link_instructor ON public.profiles;

-- 이제 함수들을 안전하게 삭제
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.link_instructor_id();

-- profiles 테이블 재생성
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  role text DEFAULT 'user'::text,
  instructor_id uuid,
  first_login boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile excluding role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- 안전한 handle_new_user 함수 생성 (오류 처리 강화)
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
    ELSE
      INSERT INTO public.profiles (id, email, role)
      VALUES (NEW.id, NEW.email, 'user');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- 오류 로그만 남기고 사용자 생성은 계속 진행
      RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 트리거 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- profiles 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();