-- Add unique constraint to prevent duplicate instructor-course assignments
ALTER TABLE public.instructor_courses 
ADD CONSTRAINT unique_instructor_course 
UNIQUE (instructor_id, course_id);

-- Add unique constraint to prevent duplicate course titles
ALTER TABLE public.courses 
ADD CONSTRAINT unique_course_title 
UNIQUE (title);