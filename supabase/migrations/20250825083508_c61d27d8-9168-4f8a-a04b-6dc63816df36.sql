-- Setup cron jobs for dashboard optimization
-- Refresh materialized views every hour during business hours
SELECT cron.schedule(
  'refresh-dashboard-cache-hourly',
  '0 8-18 * * 1-5', -- Every hour from 8 AM to 6 PM, Monday to Friday
  $$
  SELECT
    net.http_post(
        url:='https://zxjiugmqfzqluviuwztr.supabase.co/functions/v1/refresh-dashboard-cache',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aml1Z21xZnpxbHV2aXV3enRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQyODcsImV4cCI6MjA2ODM4MDI4N30.exhEJujuL9-YVe8VW-J2-PoACUo1X1Cl2C0lL23K9x8"}'::jsonb,
        body:='{"dryRun": false}'::jsonb
    ) as request_id;
  $$
);

-- Refresh materialized views once daily during off-hours
SELECT cron.schedule(
  'refresh-dashboard-cache-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://zxjiugmqfzqluviuwztr.supabase.co/functions/v1/refresh-dashboard-cache',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aml1Z21xZnpxbHV2aXV3enRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQyODcsImV4cCI6MjA2ODM4MDI4N30.exhEJujuL9-YVe8VW-J2-PoACUo1X1Cl2C0lL23K9x8"}'::jsonb,
        body:='{"dryRun": false}'::jsonb
    ) as request_id;
  $$
);

-- Auto-create yearly partitions for next year in December
SELECT cron.schedule(
  'create-yearly-partitions',
  '0 0 1 12 *', -- December 1st every year
  $$
  SELECT public.create_yearly_partitions(EXTRACT(YEAR FROM NOW())::INTEGER + 1);
  $$
);

-- Cleanup old partitions every January (keep last 3 years)
SELECT cron.schedule(
  'cleanup-old-partitions',
  '0 2 1 1 *', -- January 1st every year at 2 AM
  $$
  SELECT public.cleanup_old_partitions();
  $$
);

-- Log successful cron setup
INSERT INTO public.audit_logs (action, table_name, new_values, created_at)
VALUES ('cron_jobs_setup', 'system', 
        jsonb_build_object(
          'jobs', ARRAY[
            'refresh-dashboard-cache-hourly',
            'refresh-dashboard-cache-daily', 
            'create-yearly-partitions',
            'cleanup-old-partitions'
          ],
          'setup_at', NOW()
        ), NOW());