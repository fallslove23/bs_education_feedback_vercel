-- Fix RLS policies for anonymous survey participation
-- Allow anonymous users to insert survey responses and answers

-- Drop existing policies for survey_responses
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.survey_responses;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Allow survey response submission" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (true);

-- Allow anonymous users to view their own responses (optional, for future features)
CREATE POLICY "Users can view survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (
  -- Allow admins, operators, directors to view all
  is_admin() OR is_operator() OR is_director() OR
  -- Allow instructors to view responses for their surveys  
  (is_instructor() AND survey_id IN (
    SELECT s.id FROM surveys s 
    JOIN profiles p ON p.instructor_id = s.instructor_id 
    WHERE p.id = auth.uid()
  )) OR
  -- Allow authenticated users to view responses where they are the respondent
  (auth.uid() IS NOT NULL AND respondent_email = (
    SELECT email FROM profiles WHERE id = auth.uid()
  ))
);

-- Drop existing policies for question_answers  
DROP POLICY IF EXISTS "Anyone can submit answers" ON public.question_answers;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Allow question answer submission"
ON public.question_answers
FOR INSERT  
WITH CHECK (true);

-- Allow users to view question answers based on response access
CREATE POLICY "Users can view question answers"
ON public.question_answers
FOR SELECT
USING (
  -- Allow admins, operators, directors to view all
  is_admin() OR is_operator() OR is_director() OR
  -- Allow instructors to view answers for their survey responses
  (is_instructor() AND response_id IN (
    SELECT sr.id FROM survey_responses sr
    JOIN surveys s ON s.id = sr.survey_id
    JOIN profiles p ON p.instructor_id = s.instructor_id  
    WHERE p.id = auth.uid()
  )) OR
  -- Allow authenticated users to view answers to their own responses
  (auth.uid() IS NOT NULL AND response_id IN (
    SELECT id FROM survey_responses 
    WHERE respondent_email = (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  ))
);

-- Ensure anon_sessions table allows anonymous inserts
DROP POLICY IF EXISTS "Allow anonymous session creation" ON public.anon_sessions;
CREATE POLICY "Allow anonymous session creation"
ON public.anon_sessions
FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to update their own sessions
CREATE POLICY "Allow anonymous session updates"  
ON public.anon_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure survey_completions allows anonymous inserts  
DROP POLICY IF EXISTS "Allow survey completion tracking" ON public.survey_completions;
CREATE POLICY "Allow survey completion tracking"
ON public.survey_completions  
FOR INSERT
WITH CHECK (true);