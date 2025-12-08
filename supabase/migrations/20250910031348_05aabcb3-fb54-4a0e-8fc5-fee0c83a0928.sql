-- Fix surveys_list_v1 to only show instructor_name when the linked profile actually has 'instructor' role
-- Also ensure anonymous users can access active/public surveys without authentication

DROP VIEW IF EXISTS public.surveys_list_v1;

CREATE VIEW public.surveys_list_v1 AS
SELECT 
    s.id,
    s.title,
    s.status,
    s.course_name,
    s.education_year,
    s.education_round,
    s.education_day,
    s.expected_participants,
    s.course_id,
    s.template_id,
    s.start_date,
    s.end_date,
    s.created_at,
    s.is_test,
    s.is_combined,
    s.combined_round_start,
    s.combined_round_end,
    s.round_label,
    s.description,
    s.created_by,
    c.title as course_title,
    p.email as creator_email,
    s.instructor_id,
    -- Only show instructor name if the person actually has instructor role
    CASE 
        WHEN s.instructor_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN profiles prof ON ur.user_id = prof.id 
            WHERE prof.instructor_id = s.instructor_id 
            AND ur.role = 'instructor'
        ) THEN i.name
        ELSE NULL
    END as instructor_name
FROM surveys s
LEFT JOIN courses c ON s.course_id = c.id
LEFT JOIN instructors i ON s.instructor_id = i.id
LEFT JOIN profiles p ON s.created_by = p.id;

-- Update surveys table RLS policies to allow anonymous access to active/public surveys
DROP POLICY IF EXISTS "Anonymous can view active surveys" ON public.surveys;
CREATE POLICY "Anonymous can view active surveys"
ON public.surveys
FOR SELECT
TO anon
USING (status IN ('active', 'public'));

-- Ensure survey questions are accessible to anonymous users for active surveys
DROP POLICY IF EXISTS "Anonymous can view questions for active surveys" ON public.survey_questions;
CREATE POLICY "Anonymous can view questions for active surveys"
ON public.survey_questions
FOR SELECT
TO anon
USING (survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
));

-- Ensure survey sections are accessible to anonymous users for active surveys
DROP POLICY IF EXISTS "Anonymous can view sections for active surveys" ON public.survey_sections;
CREATE POLICY "Anonymous can view sections for active surveys"
ON public.survey_sections
FOR SELECT
TO anon
USING (survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
));

-- Ensure survey sessions are accessible to anonymous users for active surveys
DROP POLICY IF EXISTS "Anonymous can view sessions for active surveys" ON public.survey_sessions;
CREATE POLICY "Anonymous can view sessions for active surveys"
ON public.survey_sessions
FOR SELECT
TO anon
USING (survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
));

-- Allow anonymous users to submit responses to active/public surveys
DROP POLICY IF EXISTS "Anonymous can submit responses to active surveys" ON public.survey_responses;
CREATE POLICY "Anonymous can submit responses to active surveys"
ON public.survey_responses
FOR INSERT
TO anon
WITH CHECK (survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status IN ('active', 'public')
));

-- Allow anonymous users to submit answers to questions for active surveys
DROP POLICY IF EXISTS "Anonymous can submit answers to active surveys" ON public.question_answers;
CREATE POLICY "Anonymous can submit answers to active surveys"
ON public.question_answers
FOR INSERT
TO anon
WITH CHECK (EXISTS (
    SELECT 1 FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE sr.id = question_answers.response_id
    AND s.status IN ('active', 'public')
));