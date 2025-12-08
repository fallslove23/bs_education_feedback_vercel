-- Enable anonymous session management for survey participation
-- Create anon session tracking policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'anon_sessions' 
        AND policyname = 'Anonymous users can manage sessions'
    ) THEN
        CREATE POLICY "Anonymous users can manage sessions"
        ON public.anon_sessions
        FOR ALL
        TO anon
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;