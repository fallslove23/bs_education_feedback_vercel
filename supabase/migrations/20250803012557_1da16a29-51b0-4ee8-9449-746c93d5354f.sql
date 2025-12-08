-- Fix RLS policy for survey_responses INSERT
DROP POLICY "Anyone can submit responses" ON public.survey_responses;

CREATE POLICY "Anyone can submit responses" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (true);