-- 아이누르와 유재섭의 역할 설정을 위한 임시 프로필 생성 및 역할 부여
-- 이들이 실제 로그인하면 기존 프로필과 연결됩니다.

-- 1. 아이누르 (운영 역할)
DO $$
DECLARE
    ainura_user_id uuid;
    ainura_instructor_id uuid := 'fb845ed5-55b0-4816-9cd1-0193f8b0a519';
BEGIN
    -- 기존 프로필 확인
    SELECT id INTO ainura_user_id FROM profiles WHERE instructor_id = ainura_instructor_id;
    
    IF ainura_user_id IS NULL THEN
        -- 임시 UUID 생성 (실제 로그인 시 업데이트됨)
        ainura_user_id := gen_random_uuid();
        
        -- profiles에 임시 레코드 생성
        INSERT INTO profiles (id, email, instructor_id, role, first_login)
        VALUES (ainura_user_id, 'ainura624@osstem.com', ainura_instructor_id, 'operator', true)
        ON CONFLICT (email) DO UPDATE SET 
            instructor_id = ainura_instructor_id,
            role = 'operator';
            
        -- 기존 역할 삭제 후 새 역할 추가
        DELETE FROM user_roles WHERE user_id = ainura_user_id;
        INSERT INTO user_roles (user_id, role) VALUES (ainura_user_id, 'operator');
    END IF;
END $$;

-- 2. 유재섭 (조직장 역할)  
DO $$
DECLARE
    yoo_user_id uuid;
    yoo_instructor_id uuid := '3bd97329-75a0-442a-ac39-92db5c2ea21e';
BEGIN
    -- 기존 프로필 확인
    SELECT id INTO yoo_user_id FROM profiles WHERE instructor_id = yoo_instructor_id;
    
    IF yoo_user_id IS NULL THEN
        -- 임시 UUID 생성 (실제 로그인 시 업데이트됨)
        yoo_user_id := gen_random_uuid();
        
        -- profiles에 임시 레코드 생성
        INSERT INTO profiles (id, email, instructor_id, role, first_login)
        VALUES (yoo_user_id, 'josephyoo23@osstem.com', yoo_instructor_id, 'director', true)
        ON CONFLICT (email) DO UPDATE SET 
            instructor_id = yoo_instructor_id,
            role = 'director';
            
        -- 기존 역할 삭제 후 새 역할 추가
        DELETE FROM user_roles WHERE user_id = yoo_user_id;
        INSERT INTO user_roles (user_id, role) VALUES (yoo_user_id, 'director');
    END IF;
END $$;