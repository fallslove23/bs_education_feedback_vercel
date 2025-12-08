-- Identify and fix specific SECURITY DEFINER views causing security issues
-- The previous migration didn't catch them, so let's be more thorough

-- First, let's check what views actually exist and their definitions
DO $$
DECLARE
    view_rec RECORD;
    func_rec RECORD;
BEGIN
    -- Check all views in pg_class for any with special security settings
    RAISE NOTICE 'Checking all views for SECURITY DEFINER properties...';
    
    FOR view_rec IN 
        SELECT 
            n.nspname as schema_name,
            c.relname as view_name,
            c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relkind IN ('v', 'm') -- views and materialized views
        ORDER BY c.relname
    LOOP
        RAISE NOTICE 'Found view: %.%', view_rec.schema_name, view_rec.view_name;
    END LOOP;

    -- Check if there are any functions that are incorrectly being treated as views
    RAISE NOTICE 'Checking functions that might be causing view security issues...';
    
    FOR func_rec IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            p.prosecdef as is_security_definer,
            pg_get_function_result(p.oid) as return_type
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prosecdef = true  -- SECURITY DEFINER functions
        AND pg_get_function_result(p.oid) LIKE '%TABLE%'  -- Functions that return tables (act like views)
        ORDER BY p.proname
    LOOP
        RAISE NOTICE 'Found SECURITY DEFINER function that returns table: %.% (return type: %)', 
                     func_rec.schema_name, func_rec.function_name, func_rec.return_type;
        
        -- Convert these table-returning SECURITY DEFINER functions to SECURITY INVOKER
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I() SECURITY INVOKER', func_rec.schema_name, func_rec.function_name);
            RAISE NOTICE 'Converted function %.% to SECURITY INVOKER', func_rec.schema_name, func_rec.function_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not convert function %.%: %', func_rec.schema_name, func_rec.function_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- Specifically check our known views and ensure they don't have SECURITY DEFINER
-- by recreating them explicitly without it

-- Drop and recreate survey_cumulative_stats as a regular view
DROP VIEW IF EXISTS public.survey_cumulative_stats CASCADE;

CREATE VIEW public.survey_cumulative_stats AS
SELECT
  s.id AS survey_id,
  s.education_year,
  s.education_round,
  s.expected_participants,
  s.created_at,
  COALESCE(s.is_test, false) AS survey_is_test,
  s.title,
  s.status,
  s.course_name,
  i.name AS instructor_names_text,
  ARRAY[i.name] AS instructor_names,
  COUNT(DISTINCT i.id) AS instructor_count,
  COUNT(sr.id) AS total_response_count,
  COUNT(CASE WHEN COALESCE(sr.is_test, false) = false THEN sr.id END) AS real_response_count,
  COUNT(CASE WHEN COALESCE(sr.is_test, false) = true THEN sr.id END) AS test_response_count,
  MAX(sr.submitted_at) AS last_response_at,
  
  -- Overall satisfaction averages (10-point scale)
  AVG(
    CASE 
      WHEN sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_satisfaction_total,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_satisfaction_real,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_satisfaction_test,

  -- Course satisfaction averages
  AVG(
    CASE 
      WHEN sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_course_satisfaction_total,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_course_satisfaction_real,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'course' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_course_satisfaction_test,

  -- Instructor satisfaction averages
  AVG(
    CASE 
      WHEN sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_instructor_satisfaction_total,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_instructor_satisfaction_real,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'instructor' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_instructor_satisfaction_test,

  -- Operation satisfaction averages
  AVG(
    CASE 
      WHEN sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_operation_satisfaction_total,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_operation_satisfaction_real,
  
  AVG(
    CASE 
      WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type = 'operation' AND sq.question_type IN ('scale', 'rating') THEN
        CASE 
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
          WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
            THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
          ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
        END
      ELSE NULL
    END
  ) AS avg_operation_satisfaction_test,

  -- Weighted satisfaction (response count * average satisfaction)
  COALESCE(COUNT(sr.id), 0) * COALESCE(
    AVG(
      CASE 
        WHEN sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END
    ), 0
  ) AS weighted_satisfaction_total,
  
  COALESCE(COUNT(CASE WHEN COALESCE(sr.is_test, false) = false THEN sr.id END), 0) * COALESCE(
    AVG(
      CASE 
        WHEN COALESCE(sr.is_test, false) = false AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END
    ), 0
  ) AS weighted_satisfaction_real,
  
  COALESCE(COUNT(CASE WHEN COALESCE(sr.is_test, false) = true THEN sr.id END), 0) * COALESCE(
    AVG(
      CASE 
        WHEN COALESCE(sr.is_test, false) = true AND sq.satisfaction_type IN ('instructor', 'course', 'operation') AND sq.question_type IN ('scale', 'rating') THEN
          CASE 
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) IS NULL THEN NULL
            WHEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) <= 5
              THEN public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text)) * 2
            ELSE public.safe_numeric_convert(COALESCE(qa.answer_value::text, qa.answer_text))
          END
        ELSE NULL
      END
    ), 0
  ) AS weighted_satisfaction_test

FROM public.surveys s
LEFT JOIN public.instructors i ON s.instructor_id = i.id
LEFT JOIN public.survey_responses sr ON s.id = sr.survey_id
LEFT JOIN public.question_answers qa ON sr.id = qa.response_id
LEFT JOIN public.survey_questions sq ON qa.question_id = sq.id
GROUP BY 
  s.id, s.education_year, s.education_round, s.expected_participants, 
  s.created_at, s.is_test, s.title, s.status, s.course_name, i.name;

-- Grant permissions to the recreated view
GRANT SELECT ON public.survey_cumulative_stats TO authenticated;
GRANT SELECT ON public.survey_cumulative_stats TO anon;

-- Add comment explaining it's now secure
COMMENT ON VIEW public.survey_cumulative_stats IS 
  'Aggregated survey-level response counts and satisfaction averages. Recreated without SECURITY DEFINER for improved security.';

RAISE NOTICE 'Successfully recreated survey_cumulative_stats view without SECURITY DEFINER';