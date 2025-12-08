
-- PostgREST 스키마 캐시 새로 고침을 위해 NOTIFY 실행
NOTIFY pgrst, 'reload schema';

-- 추가로 survey_sessions.session_id가 sessions 테이블을 참조하는지 확인하고 외래 키 추가
DO $$
BEGIN
  -- survey_sessions.session_id -> sessions.id 외래 키가 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'survey_sessions_session_id_fkey'
    AND table_name = 'survey_sessions'
  ) THEN
    -- 잘못된 데이터 정리
    DELETE FROM public.survey_sessions
    WHERE session_id IS NOT NULL 
      AND session_id NOT IN (SELECT id FROM public.sessions);
    
    -- 외래 키 추가
    ALTER TABLE public.survey_sessions
    ADD CONSTRAINT survey_sessions_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS 정책 확인 및 추가
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;

-- survey_sessions에 대한 SELECT 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'survey_sessions' 
    AND policyname = 'Authenticated users can view survey sessions'
  ) THEN
    CREATE POLICY "Authenticated users can view survey sessions"
    ON public.survey_sessions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- admin과 operator가 survey_sessions을 관리할 수 있도록 정책 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'survey_sessions' 
    AND policyname = 'Admin and operators can manage survey sessions'
  ) THEN
    CREATE POLICY "Admin and operators can manage survey sessions"
    ON public.survey_sessions
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'operator')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'operator')
      )
    );
  END IF;
END $$;
