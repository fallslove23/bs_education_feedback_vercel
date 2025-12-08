-- Phase 2: Materialized Views for Dashboard Performance
-- Enable extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Survey statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_survey_stats AS
SELECT 
  s.id as survey_id,
  s.title,
  s.instructor_id,
  s.education_year,
  s.education_round,
  s.status,
  s.start_date,
  s.end_date,
  COUNT(sr.id) as response_count,
  s.expected_participants,
  CASE 
    WHEN s.expected_participants > 0 
    THEN ROUND((COUNT(sr.id)::numeric / s.expected_participants * 100), 1)
    ELSE 0
  END as response_rate
FROM public.surveys s
LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
GROUP BY s.id, s.title, s.instructor_id, s.education_year, s.education_round, 
         s.status, s.start_date, s.end_date, s.expected_participants;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_survey_stats_survey_id ON public.mv_survey_stats (survey_id);

-- Instructor satisfaction statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_instructor_satisfaction AS
SELECT 
  s.instructor_id,
  s.education_year,
  s.education_round,
  COUNT(DISTINCT s.id) as survey_count,
  COUNT(sr.id) as total_responses,
  AVG(
    CASE 
      WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('rating', 'scale') THEN
        CASE 
          WHEN jsonb_typeof(qa.answer_value) = 'number' THEN
            CASE 
              WHEN (qa.answer_value::text)::numeric <= 5 THEN (qa.answer_value::text)::numeric * 2
              ELSE (qa.answer_value::text)::numeric
            END
          ELSE NULL
        END
      ELSE NULL
    END
  ) as avg_instructor_satisfaction
FROM public.surveys s
LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
WHERE s.instructor_id IS NOT NULL
GROUP BY s.instructor_id, s.education_year, s.education_round;

-- Create unique index on instructor satisfaction view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_instructor_satisfaction_unique 
ON public.mv_instructor_satisfaction (instructor_id, education_year, education_round);

-- Course satisfaction statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_course_satisfaction AS
SELECT 
  s.course_id,
  s.education_year,
  s.education_round,
  COUNT(DISTINCT s.id) as survey_count,
  COUNT(sr.id) as total_responses,
  AVG(
    CASE 
      WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('rating', 'scale') THEN
        CASE 
          WHEN jsonb_typeof(qa.answer_value) = 'number' THEN
            CASE 
              WHEN (qa.answer_value::text)::numeric <= 5 THEN (qa.answer_value::text)::numeric * 2
              ELSE (qa.answer_value::text)::numeric
            END
          ELSE NULL
        END
      ELSE NULL
    END
  ) as avg_course_satisfaction
FROM public.surveys s
LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
WHERE s.course_id IS NOT NULL
GROUP BY s.course_id, s.education_year, s.education_round;

-- Create unique index on course satisfaction view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_course_satisfaction_unique 
ON public.mv_course_satisfaction (course_id, education_year, education_round);

-- Recent activity materialized view (last 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_recent_activity AS
SELECT 
  'survey_created' as activity_type,
  s.id as record_id,
  s.title as description,
  s.created_by as user_id,
  s.created_at as activity_date
FROM public.surveys s
WHERE s.created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
  'survey_response' as activity_type,
  sr.id as record_id,
  CONCAT('Response to: ', s.title) as description,
  NULL as user_id,
  sr.submitted_at as activity_date
FROM public.survey_responses sr
JOIN public.surveys s ON sr.survey_id = s.id
WHERE sr.submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY activity_date DESC
LIMIT 100;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION public.refresh_dashboard_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_survey_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_instructor_satisfaction;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_satisfaction;
  REFRESH MATERIALIZED VIEW public.mv_recent_activity; -- Cannot use CONCURRENTLY without unique index
  
  -- Log the refresh
  INSERT INTO public.audit_logs (action, table_name, new_values, created_at)
  VALUES ('materialized_view_refresh', 'dashboard_views', 
          jsonb_build_object('refreshed_at', NOW()), NOW());
END;
$$;