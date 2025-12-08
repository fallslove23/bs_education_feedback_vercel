-- Add satisfaction_type column to survey_questions table
ALTER TABLE public.survey_questions 
ADD COLUMN satisfaction_type TEXT CHECK (satisfaction_type IN ('course', 'instructor')) DEFAULT NULL;

-- Add satisfaction_type column to template_questions table
ALTER TABLE public.template_questions 
ADD COLUMN satisfaction_type TEXT CHECK (satisfaction_type IN ('course', 'instructor')) DEFAULT NULL;