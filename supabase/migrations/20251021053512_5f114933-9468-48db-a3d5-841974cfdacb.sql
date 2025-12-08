-- 과목 드롭다운 전용 뷰
CREATE OR REPLACE VIEW public.v_subject_options AS
SELECT id, title
FROM public.subjects
WHERE title IS NOT NULL
  AND title <> ''
  AND title NOT IN ('BS Basic', 'BS Advanced', 'BS Advanced 운영 만족도')
ORDER BY title;

-- 권한 부여
GRANT SELECT ON public.v_subject_options TO anon, authenticated;