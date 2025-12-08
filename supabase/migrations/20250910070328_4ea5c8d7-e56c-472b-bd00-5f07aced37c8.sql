-- Fix survey submission RLS to allow anonymous/public submissions on active surveys
-- Drop overly restrictive insert policies that require status = 'public' and time window
DROP POLICY IF EXISTS "Insert responses for open surveys only" ON public.survey_responses;
DROP POLICY IF EXISTS "Insert answers for open surveys only" ON public.question_answers;

-- Ensure remaining INSERT policies are permissive so any one can grant access
DO $$
BEGIN
  BEGIN
    ALTER POLICY "Anonymous can submit responses to active surveys" ON public.survey_responses AS PERMISSIVE;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if server version doesn't support AS PERMISSIVE
    NULL;
  END;
  BEGIN
    ALTER POLICY "Anyone can submit survey responses" ON public.survey_responses AS PERMISSIVE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER POLICY "Anonymous can submit answers to active surveys" ON public.question_answers AS PERMISSIVE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER POLICY "Anyone can submit question answers" ON public.question_answers AS PERMISSIVE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;