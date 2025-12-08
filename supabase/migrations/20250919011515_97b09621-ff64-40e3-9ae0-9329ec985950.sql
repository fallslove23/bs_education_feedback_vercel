-- Grant proper permissions for edge functions to access surveys table
-- Create a service role policy for surveys table
CREATE POLICY "Service role can manage surveys" ON public.surveys
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Also ensure the update_survey_statuses function can work properly
-- Make sure it has proper access to surveys table
DROP POLICY IF EXISTS "System can update survey status" ON public.surveys;
CREATE POLICY "System can update survey status" ON public.surveys
FOR UPDATE USING (true);

-- Grant permissions for email_logs table as well for the auto-send function
CREATE POLICY "Service role can manage email logs" ON public.email_logs
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');