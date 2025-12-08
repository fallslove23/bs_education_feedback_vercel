-- First, let's clean up duplicate data manually
DELETE FROM instructor_courses 
WHERE id IN (
    SELECT ic1.id
    FROM instructor_courses ic1
    JOIN instructor_courses ic2 ON ic1.instructor_id = ic2.instructor_id 
      AND ic1.course_id = ic2.course_id 
      AND ic1.created_at > ic2.created_at
);

-- Delete duplicate course (K3 점검방법)
DELETE FROM courses 
WHERE id IN (
    SELECT id 
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) as rn
        FROM courses 
        WHERE title = 'K3 점검방법'
    ) ranked
    WHERE rn > 1
);

-- Add unique constraint for instructor_courses if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_instructor_course' 
        AND table_name = 'instructor_courses'
    ) THEN
        ALTER TABLE public.instructor_courses 
        ADD CONSTRAINT unique_instructor_course 
        UNIQUE (instructor_id, course_id);
    END IF;
END $$;

-- Add unique constraint for course titles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_course_title' 
        AND table_name = 'courses'
    ) THEN
        ALTER TABLE public.courses 
        ADD CONSTRAINT unique_course_title 
        UNIQUE (title);
    END IF;
END $$;