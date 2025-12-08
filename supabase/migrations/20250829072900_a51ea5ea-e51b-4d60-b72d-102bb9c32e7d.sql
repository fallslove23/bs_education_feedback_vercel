-- surveys 테이블에 education_round 컬럼 추가 (이미 있지만 확인용)
-- 새로운 결과 보고를 위한 course_reports 테이블 생성

-- 과정 보고서 테이블 생성
CREATE TABLE IF NOT EXISTS public.course_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  education_year INTEGER NOT NULL,
  education_round INTEGER NOT NULL,
  course_id UUID REFERENCES public.courses(id),
  course_title TEXT NOT NULL,
  total_surveys INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  avg_instructor_satisfaction NUMERIC(4,2),
  avg_course_satisfaction NUMERIC(4,2),
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS 활성화
ALTER TABLE public.course_reports ENABLE ROW LEVEL SECURITY;

-- 관리자/운영/책임자가 볼 수 있는 정책
CREATE POLICY "Admins and operators can view course reports"
ON public.course_reports FOR SELECT
USING (is_admin() OR is_operator() OR is_director());

CREATE POLICY "Admins and operators can manage course reports"
ON public.course_reports FOR ALL
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- 트리거 추가
CREATE TRIGGER update_course_reports_updated_at
  BEFORE UPDATE ON public.course_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();