-- Adjust foreign key on survey_sessions.course_id to avoid delete/update errors
-- Strategy: allow course updates to cascade, and setting course_id to NULL on delete.

-- 1) Drop existing constraint if it exists
ALTER TABLE public.survey_sessions
  DROP CONSTRAINT IF EXISTS survey_sessions_course_id_fkey;

-- 2) Recreate with ON UPDATE CASCADE, ON DELETE SET NULL
ALTER TABLE public.survey_sessions
  ADD CONSTRAINT survey_sessions_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES public.courses(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;