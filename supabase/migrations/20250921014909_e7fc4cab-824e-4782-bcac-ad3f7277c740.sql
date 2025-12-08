-- First, let's create a safe numeric conversion function
CREATE OR REPLACE FUNCTION public.safe_numeric_convert(input_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  -- Remove quotes and handle empty strings
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove quotes if present
  input_text := TRIM(BOTH '"' FROM input_text);
  
  -- Return NULL for empty string after quote removal
  IF input_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try to convert to numeric
  BEGIN
    RETURN input_text::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$;

-- Create survey_cumulative_stats materialized view with safe numeric conversion
CREATE MATERIALIZED VIEW IF NOT EXISTS public.survey_cumulative_stats AS
SELECT 
    s.id as survey_id,
    s.title,
    s.education_year,
    s.education_round,
    s.course_name,
    s.status,
    s.expected_participants,
    s.created_at,
    s.is_test as survey_is_test,
    COALESCE(i.name, 'Unknown') as instructor_names_text,
    CASE WHEN i.name IS NOT NULL THEN ARRAY[i.name] ELSE ARRAY[]::text[] END as instructor_names,
    CASE WHEN s.instructor_id IS NOT NULL THEN 1 ELSE 0 END as instructor_count,
    
    -- Response counts
    COALESCE(resp_stats.total_responses, 0) as total_response_count,
    COALESCE(resp_stats.real_responses, 0) as real_response_count,
    COALESCE(resp_stats.test_responses, 0) as test_response_count,
    resp_stats.last_response_at,
    
    -- Overall satisfaction scores using safe conversion
    sat_stats.avg_satisfaction_total,
    sat_stats.avg_satisfaction_real,
    sat_stats.avg_satisfaction_test,
    
    -- Course satisfaction scores  
    course_sat.avg_course_satisfaction_total,
    course_sat.avg_course_satisfaction_real,
    course_sat.avg_course_satisfaction_test,
    
    -- Instructor satisfaction scores
    inst_sat.avg_instructor_satisfaction_total,
    inst_sat.avg_instructor_satisfaction_real,
    inst_sat.avg_instructor_satisfaction_test,
    
    -- Operation satisfaction scores
    op_sat.avg_operation_satisfaction_total,
    op_sat.avg_operation_satisfaction_real,
    op_sat.avg_operation_satisfaction_test,
    
    -- Weighted satisfaction scores (same as total for now)
    sat_stats.avg_satisfaction_total as weighted_satisfaction_total,
    sat_stats.avg_satisfaction_real as weighted_satisfaction_real,
    sat_stats.avg_satisfaction_test as weighted_satisfaction_test
    
FROM public.surveys s
LEFT JOIN public.instructors i ON s.instructor_id = i.id

-- Response statistics
LEFT JOIN (
    SELECT 
        sr.survey_id,
        COUNT(*) as total_responses,
        COUNT(CASE WHEN COALESCE(sr.is_test, false) = false THEN 1 END) as real_responses,
        COUNT(CASE WHEN COALESCE(sr.is_test, false) = true THEN 1 END) as test_responses,
        MAX(sr.submitted_at) as last_response_at
    FROM public.survey_responses sr
    GROUP BY sr.survey_id
) resp_stats ON s.id = resp_stats.survey_id

-- Overall satisfaction statistics with safe conversion
LEFT JOIN (
    SELECT 
        sr.survey_id,
        AVG(CASE WHEN sq.question_type = 'scale' AND qa.answer_value IS NOT NULL 
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_satisfaction_total,
        AVG(CASE WHEN sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = false
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_satisfaction_real,
        AVG(CASE WHEN sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = true
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_satisfaction_test
    FROM public.survey_responses sr
    JOIN public.question_answers qa ON sr.id = qa.response_id
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sq.question_type = 'scale'
    GROUP BY sr.survey_id
) sat_stats ON s.id = sat_stats.survey_id

-- Course satisfaction statistics
LEFT JOIN (
    SELECT 
        sr.survey_id,
        AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL 
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_course_satisfaction_total,
        AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = false
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_course_satisfaction_real,
        AVG(CASE WHEN sq.satisfaction_type = 'course' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = true
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_course_satisfaction_test
    FROM public.survey_responses sr
    JOIN public.question_answers qa ON sr.id = qa.response_id
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sq.satisfaction_type = 'course' AND sq.question_type = 'scale'
    GROUP BY sr.survey_id
) course_sat ON s.id = course_sat.survey_id

-- Instructor satisfaction statistics
LEFT JOIN (
    SELECT 
        sr.survey_id,
        AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL 
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_instructor_satisfaction_total,
        AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = false
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_instructor_satisfaction_real,
        AVG(CASE WHEN sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = true
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_instructor_satisfaction_test
    FROM public.survey_responses sr
    JOIN public.question_answers qa ON sr.id = qa.response_id
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sq.satisfaction_type = 'instructor' AND sq.question_type = 'scale'
    GROUP BY sr.survey_id
) inst_sat ON s.id = inst_sat.survey_id

-- Operation satisfaction statistics
LEFT JOIN (
    SELECT 
        sr.survey_id,
        AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL 
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_operation_satisfaction_total,
        AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = false
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_operation_satisfaction_real,
        AVG(CASE WHEN sq.satisfaction_type = 'operation' AND sq.question_type = 'scale' AND qa.answer_value IS NOT NULL AND COALESCE(sr.is_test, false) = true
            THEN public.safe_numeric_convert(qa.answer_value::text) END) as avg_operation_satisfaction_test
    FROM public.survey_responses sr
    JOIN public.question_answers qa ON sr.id = qa.response_id
    JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE sq.satisfaction_type = 'operation' AND sq.question_type = 'scale'
    GROUP BY sr.survey_id
) op_sat ON s.id = op_sat.survey_id

WHERE s.status IN ('active', 'public', 'completed');