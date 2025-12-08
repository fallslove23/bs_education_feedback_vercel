-- 무한 재귀를 유발하는 surveys 테이블의 RLS 정책 수정
-- 기존의 active_surveys_v 뷰를 참조하는 정책을 제거하고 직접 조건을 사용

DROP POLICY IF EXISTS "Public: view active surveys" ON public.surveys;

-- 새로운 정책: active_surveys_v 대신 직접 조건 사용
CREATE POLICY "Public: view active surveys direct" ON public.surveys
  FOR SELECT
  USING (
    status = 'active' AND 
    (start_date IS NULL OR now() >= start_date) AND 
    (end_date IS NULL OR now() <= end_date)
  );

-- 추가로 public 상태의 설문도 볼 수 있도록 하는 정책
CREATE POLICY "Public: view public surveys" ON public.surveys
  FOR SELECT
  USING (
    status = 'public' AND 
    (start_date IS NULL OR now() >= start_date) AND 
    (end_date IS NULL OR now() <= end_date)
  );