-- 검증: session_subjects 테이블에서 실제 외래 키 제약 조건을 확인하고 수정

-- session_subjects 테이블 외래 키를 sessions 테이블만 참조하도록 정리
-- 현재 타입에 보면 courses 테이블도 참조하고 있는데, 이는 잘못된 설정일 가능성

-- 1. 기존 외래 키 제약 삭제 및 올바른 제약 추가
DO $$
BEGIN
    -- session_subjects.session_id는 sessions.id만 참조해야 함
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%session_subjects_session%'
        AND table_name = 'session_subjects'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- 기존 잘못된 외래 키 제거
        ALTER TABLE public.session_subjects 
        DROP CONSTRAINT IF EXISTS session_subjects_session_id_fkey;
        
        ALTER TABLE public.session_subjects 
        DROP CONSTRAINT IF EXISTS session_subjects_session_fk;
    END IF;
    
    -- 올바른 외래 키 제약 추가: session_id → sessions.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'session_subjects_session_id_sessions_fkey'
        AND table_name = 'session_subjects'
    ) THEN
        ALTER TABLE public.session_subjects
        ADD CONSTRAINT session_subjects_session_id_sessions_fkey
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
    
    -- subject_id → subjects.id 외래 키도 확인
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'session_subjects_subject_id_subjects_fkey'
        AND table_name = 'session_subjects'
    ) THEN
        ALTER TABLE public.session_subjects
        ADD CONSTRAINT session_subjects_subject_id_subjects_fkey
        FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';

-- 3. 확인용 쿼리: session_subjects 테이블의 외래 키 상태 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'session_subjects'
ORDER BY tc.constraint_name;