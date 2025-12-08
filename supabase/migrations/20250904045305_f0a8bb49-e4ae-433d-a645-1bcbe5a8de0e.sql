-- Fix RLS policies to properly handle survey data access

-- Update survey responses policy to allow instructors to see responses via email matching
DROP POLICY IF EXISTS "Instructors can view responses to their surveys" ON public.survey_responses;

CREATE POLICY "Instructors can view responses to their surveys" 
ON public.survey_responses FOR SELECT 
USING (
  is_admin() OR is_operator() OR is_director() OR 
  (is_instructor() AND (
    survey_id IN (
      SELECT s.id
      FROM surveys s
      JOIN profiles p ON (p.instructor_id = s.instructor_id OR 
                         EXISTS (SELECT 1 FROM instructors i WHERE i.email = p.email AND i.id = s.instructor_id))
      WHERE p.id = auth.uid()
    )
  )) OR
  (auth.uid() IS NOT NULL AND respondent_email = (
    SELECT email FROM profiles WHERE id = auth.uid()
  ))
);

-- Update question answers policy
DROP POLICY IF EXISTS "Instructors can view answers to their survey questions" ON public.question_answers;

CREATE POLICY "Instructors can view answers to their survey questions" 
ON public.question_answers FOR SELECT 
USING (
  is_admin() OR is_operator() OR is_director() OR 
  (is_instructor() AND response_id IN (
    SELECT sr.id
    FROM survey_responses sr
    JOIN surveys s ON s.id = sr.survey_id
    JOIN profiles p ON (p.instructor_id = s.instructor_id OR 
                       EXISTS (SELECT 1 FROM instructors i WHERE i.email = p.email AND i.id = s.instructor_id))
    WHERE p.id = auth.uid()
  )) OR
  (auth.uid() IS NOT NULL AND response_id IN (
    SELECT survey_responses.id
    FROM survey_responses
    WHERE survey_responses.respondent_email = (
      SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid()
    )
  ))
);

-- Update surveys policy to properly handle instructor access
DROP POLICY IF EXISTS "Authenticated can view their surveys" ON public.surveys;

CREATE POLICY "Instructors can view their surveys" 
ON public.surveys FOR SELECT 
USING (
  is_admin() OR is_operator() OR is_director() OR
  (auth.uid() IS NOT NULL AND (
    instructor_id IN (
      SELECT p.instructor_id 
      FROM profiles p 
      WHERE p.id = auth.uid() AND p.instructor_id IS NOT NULL
    ) OR
    instructor_id IN (
      SELECT i.id 
      FROM instructors i 
      JOIN profiles p ON i.email = p.email 
      WHERE p.id = auth.uid()
    )
  ))
);