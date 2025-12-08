-- Create RPC function for bulk answer insertion
CREATE OR REPLACE FUNCTION public.save_answers_bulk(p_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
SET search_path = public
AS $$
DECLARE
  answer_record jsonb;
BEGIN
  -- Validate input
  IF p_answers IS NULL OR jsonb_array_length(p_answers) = 0 THEN
    RETURN;
  END IF;

  -- Insert all answers in a single statement with conflict resolution
  INSERT INTO public.question_answers (
    response_id,
    question_id,
    answer_text,
    answer_value,
    created_at
  )
  SELECT 
    (elem->>'response_id')::uuid,
    (elem->>'question_id')::uuid,
    elem->>'answer_text',
    elem->'answer_value',
    now()
  FROM jsonb_array_elements(p_answers) AS elem
  ON CONFLICT (response_id, question_id) 
  DO UPDATE SET
    answer_text = EXCLUDED.answer_text,
    answer_value = EXCLUDED.answer_value,
    created_at = now();
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.save_answers_bulk(jsonb) TO authenticated;