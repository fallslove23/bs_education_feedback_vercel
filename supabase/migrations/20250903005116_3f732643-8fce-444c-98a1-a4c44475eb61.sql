-- 기존 문제가 있는 정책들 삭제
DROP POLICY IF EXISTS "Allow instructors and operators to view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Instructors can view surveys by email mapping" ON public.surveys;

-- 단순하고 안전한 정책들로 교체
CREATE POLICY "Anyone can view active surveys for participation"
ON public.surveys
FOR SELECT
USING (status = 'active');

-- 인증된 사용자용 정책 (무한 재귀 방지)
CREATE POLICY "Authenticated users can view surveys based on role"
ON public.surveys
FOR SELECT
USING (
  status = 'active' OR 
  auth.uid() IS NOT NULL AND (
    is_admin() OR 
    is_operator() OR 
    is_director() OR
    (
      is_instructor() AND 
      instructor_id IN (
        SELECT p.instructor_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.instructor_id IS NOT NULL
      )
    )
  )
);