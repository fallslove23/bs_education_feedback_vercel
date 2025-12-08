-- Add section_id column to survey_questions table
ALTER TABLE public.survey_questions 
ADD COLUMN section_id UUID REFERENCES public.survey_sections(id) ON DELETE SET NULL;