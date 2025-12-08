-- Fix survey_responses RLS policies to allow public survey submissions

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "public can submit responses" ON public.survey_responses;
DROP POLICY IF EXISTS "admins can manage responses" ON public.survey_responses;
DROP POLICY IF EXISTS "sr_read_gate" ON public.survey_responses;

-- Create new policies with proper permissions
-- Allow anyone (including anonymous users) to submit survey responses
CREATE POLICY "Anyone can submit survey responses" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (true);

-- Allow admins and operators to manage all responses
CREATE POLICY "Admins and operators can manage all responses" 
ON public.survey_responses 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- Allow instructors to view responses to their surveys
CREATE POLICY "Instructors can view their survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (
  is_admin() OR is_operator() OR is_director() OR
  (EXISTS (
    SELECT 1 FROM surveys s 
    WHERE s.id = survey_responses.survey_id 
    AND (
      s.instructor_id IN (
        SELECT instructor_id FROM profiles WHERE id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM instructors i 
        WHERE i.user_id = auth.uid() AND i.id = s.instructor_id
      )
    )
  ))
);

-- Allow users to view their own responses (if they have an email match)
CREATE POLICY "Users can view their own responses" 
ON public.survey_responses 
FOR SELECT 
USING (
  respondent_email IS NOT NULL 
  AND respondent_email = (SELECT email FROM profiles WHERE id = auth.uid())
);