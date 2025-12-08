-- Add operator info to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS operator_name text,
  ADD COLUMN IF NOT EXISTS operator_contact text;

-- No RLS policy changes needed; existing policies remain applicable.
