-- Add split-class fields to surveys table
-- Safe: add only if not exists, defaults for backward compatibility
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS is_grouped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_type text CHECK (group_type IN ('even','odd')),
  ADD COLUMN IF NOT EXISTS group_number integer CHECK (group_number >= 1);

-- Optional: comment for documentation
COMMENT ON COLUMN public.surveys.is_grouped IS 'Whether this survey is for a split class (분반)';
COMMENT ON COLUMN public.surveys.group_type IS 'Split class type: even or odd (짝수/홀수)';
COMMENT ON COLUMN public.surveys.group_number IS 'Specific group number when applicable (n조)';