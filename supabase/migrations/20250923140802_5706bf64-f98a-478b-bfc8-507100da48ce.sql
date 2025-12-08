-- Convert SECURITY DEFINER views to SECURITY INVOKER (Step by step)
-- Starting with simple views first

BEGIN;

-- 1. active_surveys_v
CREATE OR REPLACE VIEW public.active_surveys_v
WITH (security_invoker = true)
AS SELECT id,
    title,
    description,
    instructor_id,
    course_id,
    template_id,
    status,
    start_date,
    end_date,
    created_by,
    created_at,
    updated_at,
    education_year,
    education_round,
    expected_participants,
    course_name,
    education_day
   FROM surveys s
  WHERE ((status = 'active'::text) AND ((start_date IS NULL) OR (now() >= start_date)) AND ((end_date IS NULL) OR (now() <= end_date)));

-- 2. survey_available_years_v1  
CREATE OR REPLACE VIEW public.survey_available_years_v1
WITH (security_invoker = true)
AS SELECT DISTINCT education_year
   FROM surveys
  WHERE education_year IS NOT NULL
  ORDER BY education_year DESC;

COMMIT;