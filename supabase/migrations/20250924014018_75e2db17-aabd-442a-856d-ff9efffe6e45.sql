-- Fix course_statistics duplicates and upsert conflicts

-- Step 1: Remove duplicate records, keeping the most recent one for each (year, round, course_name) combination
WITH ranked_records AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY year, round, course_name 
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) as rn
  FROM public.course_statistics
)
DELETE FROM public.course_statistics 
WHERE id IN (
  SELECT id FROM ranked_records WHERE rn > 1
);

-- Step 2: Add unique constraint for year, round, course_name combination
-- This will allow ON CONFLICT (year, round, course_name) to work properly
ALTER TABLE public.course_statistics 
ADD CONSTRAINT course_statistics_year_round_course_unique 
UNIQUE (year, round, course_name);

-- Step 3: Make trigger functions SECURITY DEFINER to bypass RLS restrictions
-- Update the main course statistics function
CREATE OR REPLACE FUNCTION public.update_course_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update existing records with simpler value extraction
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
        WHEN qa.answer_value::text ~ '^"?[0-9]+(\.[0-9]+)?"?$' AND sq.question_type = 'scale'
        THEN (regexp_replace(qa.answer_value::text, '"', '', 'g'))::numeric
      END) as total_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^"?[0-9]+(\.[0-9]+)?"?$' AND sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
        THEN (regexp_replace(qa.answer_value::text, '"', '', 'g'))::numeric
      END) as course_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^"?[0-9]+(\.[0-9]+)?"?$' AND sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
        THEN (regexp_replace(qa.answer_value::text, '"', '', 'g'))::numeric
      END) as instructor_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^"?[0-9]+(\.[0-9]+)?"?$' AND sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
        THEN (regexp_replace(qa.answer_value::text, '"', '', 'g'))::numeric
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
$function$;

-- Update the trigger function to also be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trigger_update_course_statistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the trigger to run with elevated privileges
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.survey_questions sq 
    WHERE sq.id = NEW.question_id 
      AND sq.question_type = 'scale'
  ) THEN
    PERFORM public.update_course_statistics();
  END IF;
  RETURN NEW;
END;
$function$;