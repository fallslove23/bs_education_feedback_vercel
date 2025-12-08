-- Skip partitioning for now, focus on optimization functions
-- Function to optimize query performance with better date filtering
CREATE OR REPLACE FUNCTION public.get_survey_responses_by_date_range(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  response_id UUID,
  survey_id UUID,
  submitted_at TIMESTAMP WITH TIME ZONE,
  respondent_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.survey_id,
    sr.submitted_at,
    sr.respondent_email
  FROM public.survey_responses sr
  WHERE 
    CASE 
      WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
        sr.submitted_at >= start_date::timestamp AND sr.submitted_at <= end_date::timestamp
      WHEN start_date IS NOT NULL THEN
        sr.submitted_at >= start_date::timestamp
      WHEN end_date IS NOT NULL THEN
        sr.submitted_at <= end_date::timestamp
      ELSE TRUE
    END
  ORDER BY sr.submitted_at DESC;
END;
$$;

-- Function to get aggregated stats efficiently
CREATE OR REPLACE FUNCTION public.get_instructor_stats_optimized(
  instructor_id_param UUID DEFAULT NULL,
  education_year_param INTEGER DEFAULT NULL
)
RETURNS TABLE(
  instructor_id UUID,
  education_year INTEGER,
  education_round INTEGER,
  survey_count BIGINT,
  total_responses BIGINT,
  avg_satisfaction NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    ) as avg_satisfaction
  FROM public.surveys s
  LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
  LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
  LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE 
    s.instructor_id IS NOT NULL
    AND (instructor_id_param IS NULL OR s.instructor_id = instructor_id_param)
    AND (education_year_param IS NULL OR s.education_year = education_year_param)
  GROUP BY s.instructor_id, s.education_year, s.education_round
  ORDER BY s.education_year DESC, s.education_round DESC;
END;
$$;

-- Initial refresh of materialized views
SELECT public.refresh_dashboard_materialized_views();