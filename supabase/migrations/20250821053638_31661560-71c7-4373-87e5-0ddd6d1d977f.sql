-- Enable required extensions for scheduling HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule hourly invocation of the auto-send edge function (minute 5 of every hour)
select
  cron.schedule(
    'auto-send-survey-results-hourly-v1',
    '5 * * * *',
    $$
    select
      net.http_post(
        url:='https://zxjiugmqfzqluviuwztr.supabase.co/functions/v1/auto-send-survey-results',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"source":"cron"}'::jsonb
      ) as request_id;
    $$
  );