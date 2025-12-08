-- Add explicit anon access for active/public surveys and sessions
CREATE POLICY "Anon can view active/public surveys"
ON public.surveys
FOR SELECT
TO anon
USING (status = ANY (ARRAY['active'::text, 'public'::text]));

CREATE POLICY "Anon can view sessions for active/public surveys"
ON public.survey_sessions
FOR SELECT
TO anon
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE status = ANY (ARRAY['active'::text, 'public'::text])
));