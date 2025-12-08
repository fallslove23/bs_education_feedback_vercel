
-- Fix get_my_survey_stats function by adding set search_path
CREATE OR REPLACE FUNCTION public.get_my_survey_stats()
RETURNS TABLE(instructor_name text, survey_count bigint, response_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.instructor_name, s.survey_count, s.response_count
  FROM public.v_instructor_survey_stats s
  JOIN public.instructors i ON i.id = s.instructor_id
  WHERE i.user_id = auth.uid();
$$;
