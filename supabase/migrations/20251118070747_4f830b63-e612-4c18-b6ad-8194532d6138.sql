
-- 1) Helper functions to bypass RLS safely for policy checks
CREATE OR REPLACE FUNCTION public.can_submit_response(p_survey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.surveys s
    WHERE s.id = p_survey_id
      AND s.status IN ('active','public','completed')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_submit_answer(p_response_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE sr.id = p_response_id
      AND s.status IN ('active','public','completed')
  );
$$;

-- 2) Recreate policies to use the functions (avoid SELECT-on-surveys RLS in WITH CHECK)
DROP POLICY IF EXISTS "Anonymous users can submit survey responses" ON public.survey_responses;
CREATE POLICY "Anonymous users can submit survey responses"
  ON public.survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.can_submit_response(survey_id));

DROP POLICY IF EXISTS "Anonymous users can submit answers" ON public.question_answers;
CREATE POLICY "Anonymous users can submit answers"
  ON public.question_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.can_submit_answer(response_id));

-- 3) Ensure trigger that reads surveys during response insert can always read
CREATE OR REPLACE FUNCTION public.propagate_is_test_to_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_test IS NULL THEN
    SELECT is_test INTO NEW.is_test
    FROM public.surveys
    WHERE id = NEW.survey_id;
  END IF;
  RETURN NEW;
END;
$$;
