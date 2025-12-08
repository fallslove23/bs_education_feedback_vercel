-- 모든 기존 surveys 정책 삭제
DROP POLICY IF EXISTS "Allow admins and operators to manage all surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow anyone to view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view active surveys for participation" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can view surveys based on role" ON public.surveys;
DROP POLICY IF EXISTS "Allow instructors and operators to view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Instructors can view surveys by email mapping" ON public.surveys;

-- 새로운 안전한 정책들 생성
CREATE POLICY "Admins and operators can manage surveys"
ON public.surveys
FOR ALL
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Public can view active surveys"
ON public.surveys
FOR SELECT
USING (status = 'active');

CREATE POLICY "Authenticated can view their surveys"
ON public.surveys
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() OR 
    is_operator() OR 
    is_director() OR
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.instructor_id = surveys.instructor_id
    )
  )
);