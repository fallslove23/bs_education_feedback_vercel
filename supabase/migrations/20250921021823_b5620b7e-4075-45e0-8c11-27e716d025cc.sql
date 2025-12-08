-- Grant SELECT permissions on surveys_list_v1 view to authenticated and anon roles
-- This fixes the "permission denied for view surveys_list_v1" error

GRANT SELECT ON public.surveys_list_v1 TO authenticated;
GRANT SELECT ON public.surveys_list_v1 TO anon;
GRANT SELECT ON public.survey_available_years_v1 TO authenticated;
GRANT SELECT ON public.survey_available_years_v1 TO anon;