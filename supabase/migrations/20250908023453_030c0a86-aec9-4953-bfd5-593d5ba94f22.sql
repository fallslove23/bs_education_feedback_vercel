-- surveys 테이블에 public 상태 설문에 대한 읽기 정책 추가
CREATE POLICY "Public can view active surveys" 
ON public.surveys 
FOR SELECT 
USING (status IN ('active', 'public'));

-- 기존 정책이 있다면 먼저 확인하고 필요시 수정
-- surveys 테이블의 기존 정책들을 검토하여 public 접근을 허용하도록 설정