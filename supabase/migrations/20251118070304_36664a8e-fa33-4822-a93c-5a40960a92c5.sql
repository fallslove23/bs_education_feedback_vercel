
-- Fix survey_responses RLS policy for anonymous submission
-- The date check is too strict and prevents submission

-- Drop existing insert policy
DROP POLICY IF EXISTS "Anonymous users can submit survey responses" ON survey_responses;

-- Create new policy that only checks survey status (not dates)
-- Dates should be UI-level warnings, not hard blocks
CREATE POLICY "Anonymous users can submit survey responses"
  ON survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    survey_id IN (
      SELECT id 
      FROM surveys 
      WHERE status IN ('active', 'public')
    )
  );
