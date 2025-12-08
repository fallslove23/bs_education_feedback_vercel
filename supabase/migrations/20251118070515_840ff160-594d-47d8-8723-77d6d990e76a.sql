
-- Allow survey submissions for completed surveys as well
-- Some responses may come in late after the survey has ended

DROP POLICY IF EXISTS "Anonymous users can submit survey responses" ON survey_responses;

CREATE POLICY "Anonymous users can submit survey responses"
  ON survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    survey_id IN (
      SELECT id 
      FROM surveys 
      WHERE status IN ('active', 'public', 'completed')
    )
  );
