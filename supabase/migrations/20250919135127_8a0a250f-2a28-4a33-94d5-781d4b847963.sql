-- Enable Row Level Security on tables that are missing it
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for course_enrollments
CREATE POLICY "Admins and operators can manage course enrollments" 
ON public.course_enrollments 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Authenticated users can view course enrollments" 
ON public.course_enrollments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for trainees
CREATE POLICY "Admins and operators can manage trainees" 
ON public.trainees 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Authenticated users can view trainees" 
ON public.trainees 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for attendance
CREATE POLICY "Admins and operators can manage attendance" 
ON public.attendance 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Authenticated users can view attendance" 
ON public.attendance 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for activity_logs
CREATE POLICY "Admins and operators can manage activity logs" 
ON public.activity_logs 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "Authenticated users can view activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);