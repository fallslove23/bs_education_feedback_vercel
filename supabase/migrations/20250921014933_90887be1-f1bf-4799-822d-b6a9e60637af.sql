-- Complete the materialized view setup with indexes and permissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_cumulative_stats_survey_id 
ON public.survey_cumulative_stats (survey_id);

CREATE INDEX IF NOT EXISTS idx_survey_cumulative_stats_education_year 
ON public.survey_cumulative_stats (education_year);

CREATE INDEX IF NOT EXISTS idx_survey_cumulative_stats_course_name 
ON public.survey_cumulative_stats (course_name);

CREATE INDEX IF NOT EXISTS idx_survey_cumulative_stats_test 
ON public.survey_cumulative_stats (survey_is_test);

-- Enable RLS on the materialized view
ALTER TABLE public.survey_cumulative_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the materialized view
CREATE POLICY "Admins and operators can view cumulative stats" 
ON public.survey_cumulative_stats 
FOR SELECT 
USING (is_admin() OR is_operator() OR is_director());

CREATE POLICY "Instructors can view their own survey stats" 
ON public.survey_cumulative_stats 
FOR SELECT 
USING (
  is_instructor() AND survey_id IN (
    SELECT s.id 
    FROM surveys s 
    JOIN profiles p ON p.id = auth.uid()
    WHERE p.instructor_id = s.instructor_id
      OR EXISTS (
        SELECT 1 FROM instructors i 
        WHERE i.email = p.email AND i.id = s.instructor_id
      )
  )
);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_survey_cumulative_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.survey_cumulative_stats;
END;
$function$;