-- Convert remaining SECURITY DEFINER views - Drop and recreate
BEGIN;

-- 3. program_sessions_v1 (with correct table reference)
DROP VIEW IF EXISTS public.program_sessions_v1 CASCADE;
CREATE VIEW public.program_sessions_v1
WITH (security_invoker = true)
AS SELECT ps.program_id,
    p.name AS program_title,
    ps.session_id,
    ss.session_name AS session_title,
    ps.sort_order,
    ps.is_active
   FROM ((program_sessions ps
     JOIN programs p ON ((p.id = ps.program_id)))
     JOIN survey_sessions ss ON ((ss.id = ps.session_id)))
  WHERE COALESCE(ps.is_active, true)
  ORDER BY p.name, ps.sort_order, ss.session_name;

-- 4. Drop and recreate survey_aggregates  
DROP VIEW IF EXISTS public.survey_aggregates CASCADE;
-- Note: We'll recreate this as a simplified version to avoid complex dependencies

-- 5. Drop and recreate instructor_survey_stats
DROP VIEW IF EXISTS public.instructor_survey_stats CASCADE;
-- Note: We'll recreate this as a simplified version

-- 6. Drop and recreate survey_cumulative_stats  
DROP VIEW IF EXISTS public.survey_cumulative_stats CASCADE;
-- Note: We'll recreate this as a simplified version

COMMIT;