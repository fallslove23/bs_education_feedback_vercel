-- 데이터베이스 오류 해결: RLS 정책 수정

-- 1. profiles 테이블에 대한 더 관대한 정책 추가 (사용자가 자신의 프로필을 볼 수 있도록)
CREATE POLICY "Users can view own profile always" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. 강사가 자신의 강사 정보를 볼 수 있도록 정책 수정
DROP POLICY IF EXISTS "Instructors can view own profile" ON public.instructors;

CREATE POLICY "Instructors can view own profile by email" 
ON public.instructors 
FOR SELECT 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  id IN (SELECT instructor_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. 관리자를 위한 모든 데이터 접근 정책 강화
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- 4. 강사가 자신의 설문 데이터를 볼 수 있도록 정책 수정
CREATE POLICY "Instructors can view surveys for their courses" 
ON public.surveys 
FOR SELECT 
USING (
  status = 'active' OR 
  instructor_id IN (
    SELECT instructor_id FROM public.profiles 
    WHERE id = auth.uid() AND instructor_id IS NOT NULL
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. 데이터 조회를 위한 보안 함수 개선
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(id uuid, email text, role text, instructor_id uuid, first_login boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.id = user_id;
$function$;