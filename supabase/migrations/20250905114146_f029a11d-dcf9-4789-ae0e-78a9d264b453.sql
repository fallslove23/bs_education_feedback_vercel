-- Create table for course names management
CREATE TABLE public.course_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_names ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Course names are viewable by everyone" 
ON public.course_names 
FOR SELECT 
USING (true);

CREATE POLICY "Admin and operators can manage course names" 
ON public.course_names 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'operator')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_course_names_updated_at
BEFORE UPDATE ON public.course_names
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default course names
INSERT INTO public.course_names (name, description) VALUES 
('BS Basic', '기본 과정'),
('BS Advanced', '심화 과정'),
('웹개발 기초', '웹 개발 기초 과정'),
('데이터분석 입문', '데이터 분석 입문 과정');