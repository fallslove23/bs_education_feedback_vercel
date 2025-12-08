-- Update the satisfaction_type check constraint to include 'operation'
ALTER TABLE public.survey_questions 
DROP CONSTRAINT survey_questions_satisfaction_type_check;

ALTER TABLE public.survey_questions 
ADD CONSTRAINT survey_questions_satisfaction_type_check 
CHECK (satisfaction_type = ANY (ARRAY['course'::text, 'instructor'::text, 'operation'::text]));

-- Also update the template_questions table constraint for consistency
ALTER TABLE public.template_questions 
DROP CONSTRAINT template_questions_satisfaction_type_check;

ALTER TABLE public.template_questions 
ADD CONSTRAINT template_questions_satisfaction_type_check 
CHECK (satisfaction_type = ANY (ARRAY['course'::text, 'instructor'::text, 'operation'::text]));