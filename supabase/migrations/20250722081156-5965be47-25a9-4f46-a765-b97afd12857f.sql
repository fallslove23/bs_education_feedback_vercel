-- First, let's see the duplicate courses and merge them
WITH duplicate_courses AS (
  SELECT title, MIN(id) as keep_id, array_agg(id) as all_ids
  FROM courses 
  WHERE title = 'K3 점검방법'
  GROUP BY title
),
courses_to_delete AS (
  SELECT unnest(all_ids) as course_id, keep_id
  FROM duplicate_courses
  WHERE array_length(all_ids, 1) > 1
)
-- Move all instructor assignments to the course we're keeping
UPDATE instructor_courses 
SET course_id = (SELECT keep_id FROM duplicate_courses WHERE title = 'K3 점검방법')
WHERE course_id IN (
  SELECT course_id 
  FROM courses_to_delete 
  WHERE course_id != (SELECT keep_id FROM duplicate_courses WHERE title = 'K3 점검방법')
);

-- Delete duplicate instructor course assignments
DELETE FROM instructor_courses 
WHERE id IN (
  SELECT DISTINCT ic1.id
  FROM instructor_courses ic1
  JOIN instructor_courses ic2 ON ic1.instructor_id = ic2.instructor_id 
    AND ic1.course_id = ic2.course_id 
    AND ic1.id > ic2.id
);

-- Delete the duplicate course records
DELETE FROM courses 
WHERE id IN (
  SELECT course_id 
  FROM (
    SELECT id as course_id, 
           ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) as rn
    FROM courses 
    WHERE title = 'K3 점검방법'
  ) ranked
  WHERE rn > 1
);

-- Now add the unique constraints
ALTER TABLE public.instructor_courses 
ADD CONSTRAINT unique_instructor_course 
UNIQUE (instructor_id, course_id);

ALTER TABLE public.courses 
ADD CONSTRAINT unique_course_title 
UNIQUE (title);