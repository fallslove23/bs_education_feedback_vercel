-- Fix course_name field to use proper course categories instead of mixed subject names
UPDATE public.surveys 
SET course_name = CASE 
  WHEN title LIKE '%BS Basic%' THEN 'BS Basic'
  WHEN title LIKE '%BS Advanced%' THEN 'BS Advanced'  
  WHEN title LIKE '%SS%' THEN 'SS'
  ELSE course_name
END
WHERE course_name LIKE '%- BS Advanced' 
   OR course_name LIKE '%- BS Basic'
   OR course_name LIKE '%- SS'
   OR (course_name != 'BS Basic' AND course_name != 'BS Advanced' AND course_name != 'SS' AND course_name IS NOT NULL);