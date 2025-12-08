-- Add is_final_survey field to surveys table
ALTER TABLE public.surveys 
ADD COLUMN is_final_survey boolean NOT NULL DEFAULT false;