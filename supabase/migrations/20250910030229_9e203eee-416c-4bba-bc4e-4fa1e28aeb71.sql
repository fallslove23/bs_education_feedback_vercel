-- Fix anonymous access to surveys and related data once and for all
-- This ensures consistent access without constant policy changes

-- Drop conflicting policies and create unified ones for surveys
DROP POLICY IF EXISTS "Public can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Public view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "View all survey statuses" ON public.surveys;
DROP POLICY IF EXISTS "Anonymous and public can view active surveys" ON public.surveys;

-- Create unified survey access policy for anonymous and public users
CREATE POLICY "Anonymous and public can view published surveys"
ON public.surveys
FOR SELECT
TO anon, public
USING (status = ANY (ARRAY['active'::text, 'public'::text, 'completed'::text]));

-- Ensure survey_sessions are accessible to anonymous users
DROP POLICY IF EXISTS "Public can view sessions for active surveys" ON public.survey_sessions;
DROP POLICY IF EXISTS "Anonymous can view sessions for active surveys" ON public.survey_sessions;
CREATE POLICY "Anonymous can view sessions for published surveys"
ON public.survey_sessions
FOR SELECT
TO anon, public
USING (survey_id IN (
  SELECT id FROM public.surveys
  WHERE status = ANY (ARRAY['active'::text, 'public'::text, 'completed'::text])
));

-- Ensure anonymous access to survey responses and answers for submission
CREATE POLICY IF NOT EXISTS "Anonymous can insert survey responses" 
ON public.survey_responses 
FOR INSERT 
TO anon, public 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.surveys s 
  WHERE s.id = survey_responses.survey_id
  AND s.status = ANY (ARRAY['active'::text, 'public'::text])
));

CREATE POLICY IF NOT EXISTS "Anonymous can insert question answers" 
ON public.question_answers 
FOR INSERT 
TO anon, public 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.survey_responses sr
  JOIN public.surveys s ON s.id = sr.survey_id
  WHERE sr.id = question_answers.response_id
  AND s.status = ANY (ARRAY['active'::text, 'public'::text])
));

-- Ensure completion tracking works for anonymous users
CREATE POLICY IF NOT EXISTS "Anonymous can track survey completions" 
ON public.survey_completions 
FOR INSERT 
TO anon, public 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anonymous can read survey completions" 
ON public.survey_completions 
FOR SELECT 
TO anon, public 
USING (true);