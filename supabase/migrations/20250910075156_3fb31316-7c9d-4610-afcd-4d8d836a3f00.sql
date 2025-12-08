-- 1) Add unique constraint for ON CONFLICT to work
ALTER TABLE public.question_answers
ADD CONSTRAINT uq_question_answers_response_question UNIQUE (response_id, question_id);

-- 2) Ensure RPC can be called by anonymous respondents as well as authenticated users
GRANT EXECUTE ON FUNCTION public.save_answers_bulk(jsonb) TO anon, authenticated;