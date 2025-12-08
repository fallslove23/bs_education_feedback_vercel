-- Fix survey data access issues and improve RLS policies

-- Add missing RLS policies for survey_aggregates and related views
DO $$
BEGIN
  -- Ensure survey_aggregates view has proper access control
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'survey_aggregates' AND table_schema = 'public') THEN
    -- Allow authenticated users to access survey aggregates
    GRANT SELECT ON public.survey_aggregates TO authenticated;
    
    -- Revoke from anon initially, then grant specific access
    REVOKE ALL ON public.survey_aggregates FROM anon;
    -- Allow anon access only to active/public surveys
    GRANT SELECT ON public.survey_aggregates TO anon;
  END IF;

  -- Fix permissions for surveys_list_v1 if it exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'surveys_list_v1' AND table_schema = 'public') THEN
    GRANT SELECT ON public.surveys_list_v1 TO authenticated;
    GRANT SELECT ON public.surveys_list_v1 TO anon;
  END IF;

  -- Ensure proper access to course reports related data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_reports' AND table_schema = 'public') THEN
    -- Add policy for instructors to view reports for their courses
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'course_reports' 
      AND policyname = 'Instructors can view reports for their courses'
    ) THEN
      CREATE POLICY "Instructors can view reports for their courses" 
      ON public.course_reports 
      FOR SELECT 
      USING (
        public.is_instructor() AND EXISTS (
          SELECT 1 FROM public.surveys s 
          WHERE s.course_name = course_reports.course_title 
            AND s.instructor_id = (
              SELECT instructor_id FROM public.profiles 
              WHERE id = auth.uid()
            )
        )
      );
    END IF;
  END IF;

  -- Fix survey responses access for analysis pages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'survey_responses' 
    AND policyname = 'Directors can view all responses'
  ) THEN
    CREATE POLICY "Directors can view all responses" 
    ON public.survey_responses 
    FOR SELECT 
    USING (public.is_director());
  END IF;

  -- Fix question answers access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'question_answers' 
    AND policyname = 'Directors can view all answers'
  ) THEN
    CREATE POLICY "Directors can view all answers" 
    ON public.question_answers 
    FOR SELECT 
    USING (public.is_director());
  END IF;

  -- Allow authenticated users to access survey statistics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_statistics' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'course_statistics' 
      AND policyname = 'Directors can view all course statistics'
    ) THEN
      CREATE POLICY "Directors can view all course statistics" 
      ON public.course_statistics 
      FOR SELECT 
      USING (public.is_director());
    END IF;
  END IF;
END$$;

-- Grant necessary function access for data analysis
DO $$
BEGIN
  -- Ensure analysis functions are accessible to authenticated users
  GRANT EXECUTE ON FUNCTION public.get_survey_analysis(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.course_report_statistics(integer, text, integer, uuid, boolean) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_course_statistics(integer, text, integer, uuid, boolean) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_survey_detail_stats(uuid, boolean, integer, integer, integer, integer, integer, integer) TO authenticated;
  
  -- Allow directors to access all analysis functions
  GRANT EXECUTE ON FUNCTION public.get_survey_cumulative_summary(text, integer, text, boolean) TO authenticated;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Skip if functions don't exist
    NULL;
END$$;