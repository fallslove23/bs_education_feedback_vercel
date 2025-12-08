-- Fix function to handle string answer values properly
CREATE OR REPLACE FUNCTION public.update_course_statistics()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert new records for missing (year, round, course_name)
  INSERT INTO public.course_statistics (
    year, round, course_name, course_days, course_start_date, course_end_date,
    status, enrolled_count, cumulative_count, education_hours, education_days,
    total_satisfaction, course_satisfaction, instructor_satisfaction, operation_satisfaction
  )
  SELECT 
    s.education_year,
    s.education_round,
    s.course_name,
    0 as course_days,
    MIN(s.start_date)::date as course_start_date,
    MAX(s.end_date)::date as course_end_date,
    CASE 
      WHEN MAX(s.end_date) < NOW() THEN '완료'
      WHEN MIN(s.start_date) <= NOW() AND MAX(s.end_date) >= NOW() THEN '진행 중'
      ELSE '진행 예정'
    END as status,
    COALESCE(COUNT(DISTINCT sr.id), 0) as enrolled_count,
    0 as cumulative_count,
    96 as education_hours,
    12 as education_days,
    AVG(CASE 
      WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
    END) as total_satisfaction,
    AVG(CASE 
      WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
    END) as course_satisfaction,
    AVG(CASE 
      WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
    END) as instructor_satisfaction,
    AVG(CASE 
      WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
      THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
    END) as operation_satisfaction
  FROM public.surveys s
  LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
  LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
  LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
  WHERE s.status IN ('completed', 'active')
    AND s.course_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.course_statistics cs 
      WHERE cs.year = s.education_year 
        AND cs.round = s.education_round 
        AND cs.course_name = s.course_name
    )
  GROUP BY s.education_year, s.education_round, s.course_name;

  -- Update existing records with corrected value extraction
  UPDATE public.course_statistics 
  SET 
    total_satisfaction = COALESCE(calculated.total_satisfaction, public.course_statistics.total_satisfaction),
    course_satisfaction = COALESCE(calculated.course_satisfaction, public.course_statistics.course_satisfaction), 
    instructor_satisfaction = COALESCE(calculated.instructor_satisfaction, public.course_statistics.instructor_satisfaction),
    operation_satisfaction = COALESCE(calculated.operation_satisfaction, public.course_statistics.operation_satisfaction),
    enrolled_count = COALESCE(calculated.response_count, public.course_statistics.enrolled_count),
    updated_at = now()
  FROM (
    SELECT 
      s.education_year as year,
      s.education_round as round,
      s.course_name,
      COUNT(DISTINCT sr.id) as response_count,
      AVG(CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
        WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      END) as total_satisfaction,
      AVG(CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
        WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      END) as course_satisfaction,
      AVG(CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
        WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      END) as instructor_satisfaction,
      AVG(CASE 
        WHEN jsonb_typeof(qa.answer_value) = 'string' AND qa.answer_value::text ~ '^"[0-9]+(\.[0-9]+)?"$' AND sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
        WHEN jsonb_typeof(qa.answer_value) = 'number' AND sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
        THEN CASE WHEN (qa.answer_value#>>'{}')::numeric <= 5 AND (qa.answer_value#>>'{}')::numeric > 0 THEN (qa.answer_value#>>'{}')::numeric * 2 ELSE (qa.answer_value#>>'{}')::numeric END
      END) as operation_satisfaction
    FROM public.surveys s
    INNER JOIN public.survey_responses sr ON s.id = sr.survey_id
    INNER JOIN public.question_answers qa ON sr.id = qa.response_id
    INNER JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE s.status IN ('completed', 'active')
      AND s.course_name IS NOT NULL
      AND qa.answer_value IS NOT NULL
    GROUP BY s.education_year, s.education_round, s.course_name
  ) calculated
  WHERE public.course_statistics.year = calculated.year
    AND public.course_statistics.round = calculated.round 
    AND public.course_statistics.course_name = calculated.course_name;
END;
$$;

-- Run the corrected function
SELECT public.update_course_statistics();