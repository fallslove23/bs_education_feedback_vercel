-- Fix: Add DELETE policies for admin users to remove responses and answers

-- 1. Add DELETE policy for question_answers (admin only)
CREATE POLICY "Admins can delete answers"
ON public.question_answers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 2. Add DELETE policy for survey_responses (admin only)
CREATE POLICY "Admins can delete responses"
ON public.survey_responses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

NOTIFY pgrst, 'reload schema';