-- Add is_test column to surveys table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'surveys' AND column_name = 'is_test') THEN
        ALTER TABLE public.surveys ADD COLUMN is_test boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add is_test column to survey_responses table if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'survey_responses' AND column_name = 'is_test') THEN
        ALTER TABLE public.survey_responses ADD COLUMN is_test boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Create or replace analytics views to exclude test data
CREATE OR REPLACE VIEW public.analytics_surveys AS
SELECT *
FROM public.surveys
WHERE is_test = false;

CREATE OR REPLACE VIEW public.analytics_responses AS  
SELECT *
FROM public.survey_responses
WHERE is_test = false;

CREATE OR REPLACE VIEW public.analytics_question_answers AS
SELECT qa.*
FROM public.question_answers qa
JOIN public.survey_responses r ON r.id = qa.response_id
WHERE r.is_test = false;

-- Add RLS policies for analytics views
ALTER VIEW public.analytics_surveys SET (security_invoker = on);
ALTER VIEW public.analytics_responses SET (security_invoker = on);  
ALTER VIEW public.analytics_question_answers SET (security_invoker = on);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_is_test ON public.surveys(is_test);
CREATE INDEX IF NOT EXISTS idx_survey_responses_is_test ON public.survey_responses(is_test);