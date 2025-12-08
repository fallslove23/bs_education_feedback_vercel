-- 설문-강사 다대다 관계 테이블 생성
CREATE TABLE IF NOT EXISTS public.survey_instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(survey_id, instructor_id)
);

-- RLS 정책 설정
ALTER TABLE public.survey_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Survey instructors are viewable by everyone"
ON public.survey_instructors FOR SELECT
USING (true);

CREATE POLICY "Admin can manage survey instructors"
ON public.survey_instructors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'operator')
  )
);

-- 기존 설문들의 강사 정보를 새 테이블로 이관
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT s.id, s.instructor_id
FROM public.surveys s
WHERE s.instructor_id IS NOT NULL
ON CONFLICT (survey_id, instructor_id) DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE public.survey_instructors IS '설문과 강사의 다대다 관계를 관리하는 테이블';
COMMENT ON COLUMN public.survey_instructors.survey_id IS '설문 ID';
COMMENT ON COLUMN public.survey_instructors.instructor_id IS '강사 ID';