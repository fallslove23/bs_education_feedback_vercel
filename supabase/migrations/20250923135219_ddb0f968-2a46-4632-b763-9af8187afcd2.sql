-- Security Enhancement: Add instructor mapping and RLS policies
-- Step 1-3: Complete instructor-auth mapping and program_sessions instructor FK

BEGIN;

-- 1) Add instructors ↔ auth.users mapping
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Map existing instructors to auth.users by email (case-insensitive)
UPDATE public.instructors i
SET user_id = u.id
FROM auth.users u
WHERE i.user_id IS NULL
  AND lower(u.email) = lower(i.email);

-- Add FK constraint and unique index
ALTER TABLE public.instructors
  DROP CONSTRAINT IF EXISTS instructors_user_id_fk,
  ADD CONSTRAINT instructors_user_id_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS instructors_user_id_uidx
ON public.instructors(user_id);

-- 2) Add instructor FK to program_sessions
ALTER TABLE public.program_sessions
ADD COLUMN IF NOT EXISTS instructor_id uuid;

-- Add FK constraint
ALTER TABLE public.program_sessions
  DROP CONSTRAINT IF EXISTS program_sessions_instructor_fk,
  ADD CONSTRAINT program_sessions_instructor_fk
    FOREIGN KEY (instructor_id) REFERENCES public.instructors(id);

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_session
  ON public.survey_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_program_sessions_instructor
  ON public.program_sessions(instructor_id);

CREATE INDEX IF NOT EXISTS idx_instructors_email
  ON public.instructors(lower(email));

-- 4) RLS Helper functions
CREATE OR REPLACE FUNCTION app_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'app_role','anonymous')
$$;

CREATE OR REPLACE FUNCTION app_uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT auth.uid()
$$;

-- 5) survey_responses RLS policies
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "admin-like can read all" ON public.survey_responses;
DROP POLICY IF EXISTS "instructor sees own-session responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins/operators manage responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Public can submit survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Instructors can view responses to their surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Directors can view all responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated: view responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Public: view survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Public: no select responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Instructors and privileged can view responses for their surveys" ON public.survey_responses;

-- New RLS policies
-- Admin-like roles can read all responses
CREATE POLICY "admin-like can read all"
ON public.survey_responses
FOR SELECT
USING (
  is_admin() OR is_operator() OR is_director() OR
  app_role() IN ('operator','manager','org_lead','admin')
);

-- Instructors can only see responses from their sessions
CREATE POLICY "instructor sees own-session responses"
ON public.survey_responses
FOR SELECT
USING (
  is_instructor() AND EXISTS (
    SELECT 1
    FROM public.program_sessions ps
    JOIN public.instructors i ON i.id = ps.instructor_id
    WHERE ps.id = survey_responses.session_id
      AND i.user_id = app_uid()
  )
);

-- Public can still submit responses
CREATE POLICY "public can submit responses"
ON public.survey_responses
FOR INSERT
WITH CHECK (true);

-- Admins/operators can manage responses
CREATE POLICY "admins can manage responses"
ON public.survey_responses
FOR ALL
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

COMMIT;