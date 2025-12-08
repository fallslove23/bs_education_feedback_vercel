-- Create policy to allow public access to active/public surveys
CREATE POLICY "Public can view active surveys"
ON public.surveys
FOR SELECT
TO public
USING (
  status = ANY (ARRAY['active'::text, 'public'::text])
  AND (start_date IS NULL OR now() >= start_date)
  AND (end_date IS NULL OR now() <= end_date)
);