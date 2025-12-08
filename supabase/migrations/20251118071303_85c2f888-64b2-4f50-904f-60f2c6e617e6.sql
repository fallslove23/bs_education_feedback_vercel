
-- DROP existing problematic policies and create new permissive ones

-- 1) survey_responses: Drop existing anonymous insert policy and create a new wide-open one
DROP POLICY IF EXISTS "Anonymous users can submit survey responses" ON public.survey_responses;

CREATE POLICY "Anon can insert responses"
  ON public.survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2) question_answers: Drop existing anonymous insert policy and create a new wide-open one
DROP POLICY IF EXISTS "Anonymous users can submit answers" ON public.question_answers;

CREATE POLICY "Anon can insert answers"
  ON public.question_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
