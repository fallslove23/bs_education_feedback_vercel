-- 과정(프로그램)과 과목을 명확히 분리하는 데이터베이스 구조 개선

-- 1. 기존 courses 테이블을 과목(subjects) 테이블로 용도 변경
-- 2. 새로운 programs 테이블을 과정용으로 생성

-- 과정(프로그램) 테이블 생성 - BS Advanced, SS Basic 등 큰 교육과정
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE, -- BS Advanced, SS Basic 등
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 기존 courses 테이블에 program_id 컬럼 추가하여 과목으로 용도 변경
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

-- 과정 데이터 초기 입력
INSERT INTO public.programs (name, description) VALUES
('BS Advanced', 'BS 고급 과정'),
('BS Basic', 'BS 기초 과정'),
('SS Advanced', 'SS 고급 과정'),
('SS Basic', 'SS 기초 과정'),
('웹개발', '웹 개발 과정'),
('데이터베이스', '데이터베이스 과정')
ON CONFLICT (name) DO NOTHING;

-- programs 테이블에 RLS 활성화
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- programs 테이블 정책 생성
CREATE POLICY "Everyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins and operators can manage programs" ON public.programs 
FOR ALL USING (is_admin() OR is_operator()) WITH CHECK (is_admin() OR is_operator());

-- surveys 테이블에 program_id 컬럼 추가 (과정 정보 저장용)
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

-- 기존 course_name 데이터를 바탕으로 program_id 설정
UPDATE public.surveys 
SET program_id = (
  SELECT p.id FROM public.programs p 
  WHERE p.name = surveys.course_name
  LIMIT 1
)
WHERE course_name IS NOT NULL AND program_id IS NULL;

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.update_updated_at_programs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- programs 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_programs();