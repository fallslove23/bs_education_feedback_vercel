-- EMERGENCY KILL SWITCH V2
-- 1. Disable Auto Email Logic immediately
UPDATE cron_settings SET value = 'false' WHERE key = 'auto_email_enabled';

-- 2. Brutal Unschedule: Delete ALL jobs related to survey results to ensure no ghosts remain
DELETE FROM cron.job WHERE jobname LIKE '%auto-send-survey-results%';
-- Also clean up specific names we know of
SELECT cron.unschedule('auto-send-survey-results-daily');
SELECT cron.unschedule('auto-send-survey-results-hourly-v1');

-- 3. CLEAR PG_NET QUEUE
-- This is likely the culprit. If previous requests timed out, pg_net might be retrying them.
-- Clearing the queue stops these pending/retrying requests.
DELETE FROM net.http_request_queue;
