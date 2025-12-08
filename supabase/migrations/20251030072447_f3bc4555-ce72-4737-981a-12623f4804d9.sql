-- surveys_list_v1 뷰에 익명 사용자 접근 권한 부여
GRANT SELECT ON public.surveys_list_v1 TO anon, authenticated;

-- survey_available_years_v1 뷰에도 권한 부여
GRANT SELECT ON public.survey_available_years_v1 TO anon, authenticated;

-- program_sessions_v1 뷰에도 권한 부여 (세션 정보 조회용)
GRANT SELECT ON public.program_sessions_v1 TO anon, authenticated;

NOTIFY pgrst, 'reload schema';