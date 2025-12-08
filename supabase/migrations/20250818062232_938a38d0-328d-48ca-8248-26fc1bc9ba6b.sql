-- Add expected_participants column to surveys table
ALTER TABLE public.surveys ADD COLUMN expected_participants INTEGER DEFAULT 0;