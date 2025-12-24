-- Restore auto email sending
-- 1. Re-enable the setting
INSERT INTO cron_settings (key, value)
VALUES ('auto_email_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 2. Clean up any existing incorrectly scheduled jobs before re-scheduling
SELECT cron.unschedule('auto-send-survey-results-daily');

-- 3. Re-schedule the daily job
-- Running at 10:00 AM KST (01:00 AM UTC)
SELECT cron.schedule(
  'auto-send-survey-results-daily',
  '0 1 * * *',
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
