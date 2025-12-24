-- Emergency disable of auto emails to stop spam loop
INSERT INTO cron_settings (key, value)
VALUES ('auto_email_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET value = 'false';

-- Unschedule known jobs to prevent multiple invocations
SELECT cron.unschedule('auto-send-survey-results-daily');
SELECT cron.unschedule('auto-send-survey-results-hourly-v1');
SELECT cron.unschedule('refresh-dashboard-cache-hourly'); -- Optional cleanup if suspicious
