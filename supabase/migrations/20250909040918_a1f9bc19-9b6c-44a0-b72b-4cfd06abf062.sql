-- Harden functions created in previous migration by setting search_path
CREATE OR REPLACE FUNCTION public.update_course_statistics()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.course_statistics 
  SET 
    total_satisfaction = COALESCE(calculated.total_satisfaction, public.course_statistics.total_satisfaction),
    course_satisfaction = COALESCE(calculated.course_satisfaction, public.course_statistics.course_satisfaction), 
    instructor_satisfaction = COALESCE(calculated.instructor_satisfaction, public.course_statistics.instructor_satisfaction),
    operation_satisfaction = COALESCE(calculated.operation_satisfaction, public.course_statistics.operation_satisfaction),
    updated_at = now()
  FROM (
    SELECT 
      s.education_year as year,
      s.education_round as round,
      s.course_name,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
             AND sq.question_type = 'scale'
        THEN CASE 
               WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
                 THEN qa.answer_value::numeric * 2
               ELSE qa.answer_value::numeric 
             END
      END) as total_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
             AND sq.satisfaction_type = 'course' 
             AND sq.question_type = 'scale'
        THEN CASE 
               WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
                 THEN qa.answer_value::numeric * 2
               ELSE qa.answer_value::numeric 
             END
      END) as course_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
             AND sq.satisfaction_type = 'instructor' 
             AND sq.question_type = 'scale'
        THEN CASE 
               WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
                 THEN qa.answer_value::numeric * 2
               ELSE qa.answer_value::numeric 
             END
      END) as instructor_satisfaction,
      AVG(CASE 
        WHEN qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$' 
             AND sq.satisfaction_type = 'operation' 
             AND sq.question_type = 'scale'
        THEN CASE 
               WHEN qa.answer_value::numeric <= 5 AND qa.answer_value::numeric > 0 
                 THEN qa.answer_value::numeric * 2
               ELSE qa.answer_value::numeric 
             END
      END) as operation_satisfaction
    FROM public.surveys s
    INNER JOIN public.survey_responses sr ON s.id = sr.survey_id
    INNER JOIN public.question_answers qa ON sr.id = qa.response_id
    INNER JOIN public.survey_questions sq ON qa.question_id = sq.id
    WHERE s.status IN ('completed', 'active')
      AND s.course_name IS NOT NULL
      AND qa.answer_value IS NOT NULL
      AND qa.answer_value::text ~ '^[0-9]+(\.[0-9]+)?$'
    GROUP BY s.education_year, s.education_round, s.course_name
  ) calculated
  WHERE public.course_statistics.year = calculated.year
    AND public.course_statistics.round = calculated.round 
    AND public.course_statistics.course_name = calculated.course_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_course_statistics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

DROP TRIGGER IF EXISTS auto_update_course_statistics ON public.question_answers;
CREATE TRIGGER auto_update_course_statistics
  AFTER INSERT OR UPDATE ON public.question_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_course_statistics();

-- Run once to backfill
SELECT public.update_course_statistics();