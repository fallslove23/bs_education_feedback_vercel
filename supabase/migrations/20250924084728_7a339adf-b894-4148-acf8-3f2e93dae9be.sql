-- Create a SECURITY DEFINER function to create a survey response and return its id
-- This avoids needing SELECT permissions for anonymous users

CREATE OR REPLACE FUNCTION public.create_survey_response(
  p_survey_id uuid,
  p_session_id uuid DEFAULT NULL,
  p_respondent_email text DEFAULT NULL,
  p_is_test boolean DEFAULT false,
  p_attended boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.survey_responses (survey_id, session_id, respondent_email, is_test, attended)
  VALUES (p_survey_id, p_session_id, p_respondent_email, p_is_test, p_attended)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Ensure anon and authenticated clients can execute
GRANT EXECUTE ON FUNCTION public.create_survey_response(uuid, uuid, text, boolean, boolean) TO anon, authenticated;