-- Improve high-concurrency survey submissions by making RPC definer and upsert-based, and adding a unique index to minimize contention.

-- 1) Ensure unique key for one answer per (response_id, question_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_question_answers_response_question
ON public.question_answers (response_id, question_id);

-- 2) Create or replace bulk save function with SECURITY DEFINER and upsert logic
CREATE OR REPLACE FUNCTION public.save_answers_bulk(p_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _elem jsonb;
BEGIN
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'p_answers must be a JSON array';
  END IF;

  -- Insert or update answers in a single set-based statement to reduce locks
  INSERT INTO public.question_answers (response_id, question_id, answer_text, answer_value)
  SELECT
    (elem->>'response_id')::uuid AS response_id,
    (elem->>'question_id')::uuid AS question_id,
    elem->>'answer_text' AS answer_text,
    elem->'answer_value' AS answer_value
  FROM jsonb_array_elements(p_answers) AS elem
  ON CONFLICT (response_id, question_id)
  DO UPDATE SET
    answer_text = EXCLUDED.answer_text,
    answer_value = EXCLUDED.answer_value;
END;
$$;

-- 3) Grant execute to anon/authenticated so public forms can call the function
GRANT EXECUTE ON FUNCTION public.save_answers_bulk(jsonb) TO anon, authenticated;