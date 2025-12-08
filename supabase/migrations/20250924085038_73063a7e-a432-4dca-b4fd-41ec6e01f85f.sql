-- First let's see what policies exist on survey_responses
SELECT 
  tablename, 
  policyname, 
  cmd, 
  permissive, 
  roles, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'survey_responses' 
AND schemaname = 'public';