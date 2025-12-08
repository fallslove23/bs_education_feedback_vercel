-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to service_role
GRANT USAGE ON SCHEMA cron TO service_role;

-- Schedule auto-send-survey-results to run daily at 10:00 AM KST (01:00 AM UTC)
SELECT cron.schedule(
  'auto-send-survey-results-daily',
  '0 1 * * *', -- Every day at 01:00 UTC (10:00 KST)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-send-survey-results',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Store Supabase credentials in database settings (for cron job to use)
-- Note: These need to be set by the user in their Supabase dashboard under Database > Settings
-- Or run: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zxjiugmqfzqluviuwztr.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';