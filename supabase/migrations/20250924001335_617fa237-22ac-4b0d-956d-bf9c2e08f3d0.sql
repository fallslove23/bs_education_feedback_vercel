-- Convert final SECURITY DEFINER views
BEGIN;

-- Convert surveys_list_v1 and surveys_list_v2 to SECURITY INVOKER
DROP VIEW IF EXISTS public.surveys_list_v1 CASCADE;
CREATE VIEW public.surveys_list_v1
WITH (security_invoker = true)
AS SELECT 
    s.id,
    s.title,
    s.description,
    s.status,
    s.education_year,
    s.education_round,
    s.course_name,
    s.instructor_id,
    i.name AS instructor_name,
    s.start_date,
    s.end_date,
    s.created_at,
    s.expected_participants
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
ORDER BY s.education_year DESC, s.education_round DESC, s.created_at DESC;

DROP VIEW IF EXISTS public.surveys_list_v2 CASCADE;
CREATE VIEW public.surveys_list_v2  
WITH (security_invoker = true)
AS SELECT 
    s.id,
    s.title,
    s.description,
    s.status,
    s.education_year,
    s.education_round,
    s.course_name,
    s.instructor_id,
    i.name AS instructor_name,
    s.start_date,
    s.end_date,
    s.created_at,
    s.expected_participants,
    COUNT(sr.id) AS response_count
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
GROUP BY s.id, s.title, s.description, s.status, s.education_year, s.education_round, 
         s.course_name, s.instructor_id, i.name, s.start_date, s.end_date, s.created_at, s.expected_participants
ORDER BY s.education_year DESC, s.education_round DESC, s.created_at DESC;

COMMIT;