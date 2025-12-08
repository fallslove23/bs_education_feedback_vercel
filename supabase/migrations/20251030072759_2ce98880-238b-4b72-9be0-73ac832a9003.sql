-- Fix infinite recursion by removing cyclic policy and replacing with non-cyclic version
-- 1) Drop the instructor policy that joins survey_sessions (creates cycle with survey_sessions -> surveys)
DROP POLICY IF EXISTS "rls_surveys_instructor" ON public.surveys;

-- 2) Recreate instructor visibility using survey_instructors (does not depend on survey_sessions)
CREATE POLICY "rls_surveys_instructor_v2"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.survey_instructors si ON si.instructor_id = p.instructor_id
    WHERE p.id = auth.uid() AND si.survey_id = surveys.id
  )
);

NOTIFY pgrst, 'reload schema';