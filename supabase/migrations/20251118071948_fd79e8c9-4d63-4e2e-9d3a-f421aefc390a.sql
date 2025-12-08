-- Open SELECT policies to allow returning rows after insert

-- survey_responses
DROP POLICY IF EXISTS "Anon can select responses" ON public.survey_responses;
CREATE POLICY "Anon can select responses"
  ON public.survey_responses
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- question_answers
DROP POLICY IF EXISTS "Anon can select answers" ON public.question_answers;
CREATE POLICY "Anon can select answers"
  ON public.question_answers
  FOR SELECT
  TO anon, authenticated
  USING (true);
