-- Create instructor_courses junction table for many-to-many relationship
CREATE TABLE public.instructor_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL,
  course_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instructor_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.instructor_courses ENABLE ROW LEVEL SECURITY;

-- Create policies for instructor_courses
CREATE POLICY "Admins can manage instructor courses" 
ON public.instructor_courses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Instructors can view their own course assignments" 
ON public.instructor_courses 
FOR SELECT 
USING (instructor_id IN (
  SELECT profiles.instructor_id 
  FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'instructor' 
  AND profiles.instructor_id IS NOT NULL
));

-- Migrate existing data from courses.instructor_id to instructor_courses
INSERT INTO public.instructor_courses (instructor_id, course_id)
SELECT instructor_id, id 
FROM public.courses 
WHERE instructor_id IS NOT NULL;

-- Remove instructor_id column from courses table
ALTER TABLE public.courses DROP COLUMN instructor_id;