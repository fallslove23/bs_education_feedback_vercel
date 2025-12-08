-- Allow anonymous users to view active surveys
CREATE POLICY "Anyone can view active surveys" 
ON public.surveys 
FOR SELECT 
USING (status = 'active');

-- Allow anonymous users to view questions for active surveys
CREATE POLICY "Anyone can view questions for active surveys" 
ON public.survey_questions 
FOR SELECT 
USING (survey_id IN (
  SELECT id FROM surveys WHERE status = 'active'
));

-- Allow anonymous users to view sections for active surveys
CREATE POLICY "Anyone can view sections for active surveys" 
ON public.survey_sections 
FOR SELECT 
USING (survey_id IN (
  SELECT id FROM surveys WHERE status = 'active'
));