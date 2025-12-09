-- Create a new version of surveys_list_v1 that properly links to programs table
-- This allows fetching valid program_id and program_name along with the survey.

BEGIN;

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
    -- Prefer program name if available, otherwise original identifier
    COALESCE(p.name, s.course_name) as course_name, 
    -- Keep original course_name field as 'original_course_name' for debugging if needed, 
    -- but usually clients consume 'course_name'. 
    -- However, we must ensure existing clients don't break. 
    -- The request is to filter by Standard Courses.
    
    s.course_id, -- Keep this if it was used for something else
    
    -- Expose Program info
    s.program_id,
    p.name as program_name,
    
    s.instructor_id,
    i.name AS instructor_name,
    
    s.start_date,
    s.end_date,
    s.created_at,
    s.expected_participants,
    s.creator_email
    
FROM surveys s
LEFT JOIN instructors i ON i.id = s.instructor_id
LEFT JOIN programs p ON p.id = s.program_id
ORDER BY s.education_year DESC, s.education_round DESC, s.created_at DESC;

-- Grant access
GRANT SELECT ON public.surveys_list_v1 TO authenticated, anon;

COMMIT;
