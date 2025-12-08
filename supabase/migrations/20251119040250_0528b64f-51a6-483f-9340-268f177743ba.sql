-- Drop existing cron job if exists
SELECT cron.unschedule('auto-send-survey-results-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-send-survey-results-daily'
);

-- Create a settings table to store configuration
CREATE TABLE IF NOT EXISTS public.cron_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cron_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write cron settings
CREATE POLICY "Only admins can manage cron settings"
  ON public.cron_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert default Supabase URL
INSERT INTO public.cron_settings (key, value) 
VALUES ('supabase_url', 'https://zxjiugmqfzqluviuwztr.supabase.co')
ON CONFLICT (key) DO NOTHING;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_send_survey_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT value INTO v_url FROM public.cron_settings WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.cron_settings WHERE key = 'service_role_key';
  
  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/auto-send-survey-results',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := '{}'::jsonb
    );
  END IF;
END;
$$;

-- Schedule the function to run daily at 10:00 AM KST (01:00 AM UTC)
SELECT cron.schedule(
  'auto-send-survey-results-daily',
  '0 1 * * *',
  'SELECT public.trigger_auto_send_survey_results();'
);