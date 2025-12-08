-- surveys 테이블의 모든 RLS 정책을 제거하고 다시 생성
-- 무한 재귀를 유발하는 모든 정책들을 제거

-- 기존 정책들 모두 제거
DROP POLICY IF EXISTS "Public: view active surveys direct" ON public.surveys;
DROP POLICY IF EXISTS "Public: view public surveys" ON public.surveys;
DROP POLICY IF EXISTS "Public: view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Public: view open surveys only" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated: view all surveys" ON public.surveys;
DROP POLICY IF EXISTS "Instructors can view their surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins and operators can manage surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins/operators manage surveys" ON public.surveys;

-- 안전한 새로운 정책들 생성
-- 1. 관리자와 운영자는 모든 설문 관리 가능
CREATE POLICY "Admins and operators manage surveys" ON public.surveys
  FOR ALL
  USING (is_admin() OR is_operator())
  WITH CHECK (is_admin() OR is_operator());

-- 2. 인증된 사용자는 모든 설문 조회 가능 (내부 사용자용)
CREATE POLICY "Authenticated users view surveys" ON public.surveys
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. 공개된 활성 설문은 누구나 조회 가능 (무한 재귀 방지를 위해 단순한 조건 사용)
CREATE POLICY "Public view active surveys" ON public.surveys
  FOR SELECT
  USING (
    status IN ('active', 'public') AND 
    start_date <= now() AND 
    end_date >= now()
  );

-- 4. 모든 설문 상태 조회 가능 (전체 보기용)  
CREATE POLICY "View all survey statuses" ON public.surveys
  FOR SELECT
  USING (status IN ('active', 'public', 'draft', 'completed'));