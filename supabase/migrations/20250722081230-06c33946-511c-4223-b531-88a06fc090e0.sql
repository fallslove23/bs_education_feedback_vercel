-- Handle duplicate courses by keeping the oldest one and merging assignments
DO $$
DECLARE
    duplicate_course_id uuid;
    keep_course_id uuid;
BEGIN
    -- Get the duplicate course IDs for 'K3 점검방법'
    SELECT id INTO keep_course_id FROM courses WHERE title = 'K3 점검방법' ORDER BY created_at LIMIT 1;
    SELECT id INTO duplicate_course_id FROM courses WHERE title = 'K3 점검방법' ORDER BY created_at DESC LIMIT 1;
    
    -- Only proceed if we found duplicates
    IF keep_course_id != duplicate_course_id THEN
        -- Update instructor assignments to point to the course we're keeping
        UPDATE instructor_courses 
        SET course_id = keep_course_id
        WHERE course_id = duplicate_course_id;
        
        -- Delete the duplicate course
        DELETE FROM courses WHERE id = duplicate_course_id;
    END IF;
    
    -- Remove duplicate instructor course assignments (same instructor, same course)
    DELETE FROM instructor_courses 
    WHERE id IN (
        SELECT DISTINCT ic1.id
        FROM instructor_courses ic1
        JOIN instructor_courses ic2 ON ic1.instructor_id = ic2.instructor_id 
          AND ic1.course_id = ic2.course_id 
          AND ic1.created_at > ic2.created_at
    );
END $$;

-- Now add the unique constraints
ALTER TABLE public.instructor_courses 
ADD CONSTRAINT unique_instructor_course 
UNIQUE (instructor_id, course_id);

ALTER TABLE public.courses 
ADD CONSTRAINT unique_course_title 
UNIQUE (title);