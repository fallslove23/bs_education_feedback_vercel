-- Allow public (anonymous) users to read active/public surveys for participation
-- This policy is needed so that /survey/:id can load without login
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.nspname = t.schemaname
    WHERE t.schemaname = 'public' AND t.tablename = 'surveys' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY';
  END IF;

  -- Create policy to allow public select of active/public surveys within time window
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'surveys' AND policyname = 'Public: view active or public surveys'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Public: view active or public surveys"
      ON public.surveys
      FOR SELECT
      USING (
        status = ANY (ARRAY['active'::text, 'public'::text])
        AND (start_date IS NULL OR now() >= start_date)
        AND (end_date   IS NULL OR now() <= end_date)
      );
    $$;
  END IF;
END $$;