-- Remove restrictive INSERT policies that block active surveys from anonymous submission
DROP POLICY IF EXISTS "Insert responses for open surveys only" ON public.survey_responses;
DROP POLICY IF EXISTS "Insert answers for open surveys only" ON public.question_answers;