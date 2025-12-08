-- Create survey_sections table for organizing questions within surveys
CREATE TABLE public.survey_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on survey_sections
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for survey_sections
CREATE POLICY "Admins can manage survey sections" 
ON public.survey_sections 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)
));

CREATE POLICY "Instructors can view sections for their surveys" 
ON public.survey_sections 
FOR SELECT 
USING (survey_id IN ( 
  SELECT s.id 
  FROM surveys s 
  JOIN profiles p ON (p.instructor_id = s.instructor_id) 
  WHERE (p.id = auth.uid()) AND (p.role = 'instructor'::text)
));

-- Add trigger for updated_at
CREATE TRIGGER update_survey_sections_updated_at
BEFORE UPDATE ON public.survey_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();