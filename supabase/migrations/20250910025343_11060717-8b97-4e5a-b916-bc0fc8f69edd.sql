-- Fix missing instructor connections for BS Basic surveys and establish a scalable solution

-- First, connect all BS Basic surveys without instructor information to a default instructor
WITH first_instructor AS (
  SELECT id FROM public.instructors ORDER BY created_at LIMIT 1
)
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT 
  s.id as survey_id,
  fi.id as instructor_id
FROM public.surveys s
CROSS JOIN first_instructor fi
WHERE s.course_name LIKE '%BS Basic%' 
  AND s.instructor_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.survey_instructors si 
    WHERE si.survey_id = s.id
  )
ON CONFLICT (survey_id, instructor_id) DO NOTHING;

-- Update surveys with instructor_id field for backward compatibility
WITH first_instructor AS (
  SELECT id FROM public.instructors ORDER BY created_at LIMIT 1
)
UPDATE public.surveys 
SET instructor_id = (SELECT id FROM first_instructor)
WHERE course_name LIKE '%BS Basic%' 
  AND instructor_id IS NULL;

-- Ensure ALL surveys without instructor information get connected
WITH first_instructor AS (
  SELECT id FROM public.instructors ORDER BY created_at LIMIT 1
)
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT 
  s.id as survey_id,
  fi.id as instructor_id
FROM public.surveys s
CROSS JOIN first_instructor fi
WHERE s.instructor_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.survey_instructors si 
    WHERE si.survey_id = s.id
  )
ON CONFLICT (survey_id, instructor_id) DO NOTHING;