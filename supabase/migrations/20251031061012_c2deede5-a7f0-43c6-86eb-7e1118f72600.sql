-- Grant access to surveys_list_v1 view for authenticated and anonymous users
GRANT SELECT ON public.surveys_list_v1 TO authenticated, anon;

-- Grant access to other key views that may be used in the application
GRANT SELECT ON public.survey_available_years_v1 TO authenticated, anon;
GRANT SELECT ON public.active_surveys_v TO authenticated, anon;
GRANT SELECT ON public.survey_aggregates TO authenticated, anon;
GRANT SELECT ON public.public_survey_aggregates TO authenticated, anon;
GRANT SELECT ON public.survey_cumulative_stats TO authenticated, anon;
GRANT SELECT ON public.instructor_survey_stats TO authenticated, anon;
GRANT SELECT ON public.analytics_surveys TO authenticated, anon;
GRANT SELECT ON public.analytics_responses TO authenticated, anon;
GRANT SELECT ON public.analytics_question_answers TO authenticated, anon;

-- Grant access to program_sessions_v1 which is used for session filtering
GRANT SELECT ON public.program_sessions_v1 TO authenticated, anon;