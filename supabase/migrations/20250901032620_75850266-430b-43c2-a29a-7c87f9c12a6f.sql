-- Add education_day column to surveys table
ALTER TABLE public.surveys 
ADD COLUMN education_day INTEGER DEFAULT 1;