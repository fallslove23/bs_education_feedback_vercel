-- Enable required extensions (idempotent)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Unschedule existing job with the same name to avoid duplicates
select cron.unschedule(j.jobid)
from cron.job j
where j.jobname = 'auto-send-survey-results-every-10-min';

-- Schedule the auto-send function to run every 10 minutes
select
  cron.schedule(
    'auto-send-survey-results-every-10-min',
    '*/10 * * * *',
    $$
    select
      net.http_post(
        url:='https://zxjiugmqfzqluviuwztr.supabase.co/functions/v1/auto-send-survey-results',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aml1Z21xZnpxbHV2aXV3enRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQyODcsImV4cCI6MjA2ODM4MDI4N30.exhEJujuL9-YVe8VW-J2-PoACUo1X1Cl2C0lL23K9x8"}'::jsonb,
        body:='{"limit": 20}'::jsonb
      ) as request_id;
    $$
  );
