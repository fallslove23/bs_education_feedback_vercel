-- Disable RLS completely for survey_responses table to allow anonymous submissions
-- This is necessary for public surveys where users don't need to be authenticated

ALTER TABLE public.survey_responses DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS but create a policy that allows public access
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can submit survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins and operators can manage all responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Instructors can view their survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view their own responses" ON public.survey_responses;

-- Create a simple policy that allows anyone to insert responses
CREATE POLICY "Public can insert responses" 
ON public.survey_responses 
FOR INSERT 
TO public
WITH CHECK (true);

-- Create policy for authenticated users to manage responses
CREATE POLICY "Authenticated can manage responses" 
ON public.survey_responses 
FOR ALL 
TO authenticated
USING (
  -- Admins and operators can see all
  is_admin() OR is_operator() OR 
  -- Instructors can see their survey responses
  (is_instructor() AND survey_id IN (
    SELECT s.id FROM surveys s 
    WHERE s.instructor_id IN (
      SELECT instructor_id FROM profiles WHERE id = auth.uid()
    )
  )) OR
  -- Users can see their own responses
  (respondent_email IS NOT NULL AND respondent_email = (
    SELECT email FROM profiles WHERE id = auth.uid()
  ))
)
WITH CHECK (
  -- Same conditions for insert/update
  is_admin() OR is_operator() OR 
  (is_instructor() AND survey_id IN (
    SELECT s.id FROM surveys s 
    WHERE s.instructor_id IN (
      SELECT instructor_id FROM profiles WHERE id = auth.uid()
    )
  )) OR
  true  -- Allow anyone to insert
);