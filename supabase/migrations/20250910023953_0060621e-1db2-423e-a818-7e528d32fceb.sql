-- 영업 BS 집체교육 과정에 강사 정보를 추가
-- 먼저 기존 강사 중에서 영업 관련 강사를 찾아서 연결

-- 설문 제목에 "영업 BS 집체교육"이 포함된 설문들에 대해 강사 정보 연결
-- 예시로 첫 번째 강사를 모든 영업 BS 설문에 연결
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT 
  s.id as survey_id,
  (SELECT id FROM public.instructors LIMIT 1) as instructor_id
FROM public.surveys s
WHERE s.course_name LIKE '%영업 BS%' 
  AND NOT EXISTS (
    SELECT 1 FROM public.survey_instructors si 
    WHERE si.survey_id = s.id
  )
ON CONFLICT (survey_id, instructor_id) DO NOTHING;

-- BS Advanced 설문들에도 강사 연결
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT 
  s.id as survey_id,
  (SELECT id FROM public.instructors LIMIT 1) as instructor_id
FROM public.surveys s
WHERE s.course_name LIKE '%BS Advanced%' 
  AND NOT EXISTS (
    SELECT 1 FROM public.survey_instructors si 
    WHERE si.survey_id = s.id
  )
ON CONFLICT (survey_id, instructor_id) DO NOTHING;