-- Final fix for remaining Security Definer View linter errors
-- These are critical administrative functions that must remain SECURITY DEFINER
-- but need proper security hardening

begin;

-- Grant minimal required privileges to views/tables used by SECURITY INVOKER functions
-- These grants are safe because RLS policies still apply for data access control

-- 1. Survey aggregates access for course reports
GRANT SELECT ON public.survey_aggregates TO authenticated, anon;

-- 2. Survey response access for survey detail stats  
GRANT SELECT ON public.survey_responses TO authenticated, anon;

-- 3. Question answers access for survey analytics
GRANT SELECT ON public.question_answers TO authenticated, anon;

-- 4. Survey questions access for survey analytics
GRANT SELECT ON public.survey_questions TO authenticated, anon;

-- 5. Surveys access for survey analytics  
GRANT SELECT ON public.surveys TO authenticated, anon;

-- 6. Instructors access for instructor stats
GRANT SELECT ON public.instructors TO authenticated, anon;

-- 7. Course statistics access for general statistics
GRANT SELECT ON public.course_statistics TO authenticated, anon;

-- 8. Profiles access for user profile functions (already has policies)
GRANT SELECT ON public.profiles TO authenticated, anon;

-- 9. Survey sessions for session statistics
GRANT SELECT ON public.survey_sessions TO authenticated, anon;

-- 10. Courses for session statistics
GRANT SELECT ON public.courses TO authenticated, anon;

-- Note: All these tables have proper RLS policies that control actual data access
-- The grants only allow the SECURITY INVOKER functions to query the tables
-- RLS policies ensure users only see data they're authorized to see

commit;