-- 안전한 설문 리스트 뷰 생성
CREATE OR REPLACE VIEW public.surveys_list_v1 AS
SELECT 
  s.id,
  s.title,
  s.description,
  s.status,
  s.education_year,
  s.education_round,
  s.course_name,
  s.start_date,
  s.end_date,
  s.created_at,
  s.updated_at,
  s.expected_participants,
  s.education_day,
  s.is_test,
  s.instructor_id,
  s.course_id,
  s.created_by,
  -- 안전한 조인으로 creator 정보 가져오기
  COALESCE(p.email, 'Unknown Creator') as creator_email,
  -- 안전한 조인으로 instructor 정보 가져오기  
  COALESCE(i.name, 'Unknown Instructor') as instructor_name,
  COALESCE(i.email, '') as instructor_email,
  -- 안전한 조인으로 course 정보 가져오기
  COALESCE(c.title, s.course_name, 'Unknown Course') as course_title
FROM public.surveys s
LEFT JOIN public.profiles p ON s.created_by = p.id
LEFT JOIN public.instructors i ON s.instructor_id = i.id  
LEFT JOIN public.courses c ON s.course_id = c.id;