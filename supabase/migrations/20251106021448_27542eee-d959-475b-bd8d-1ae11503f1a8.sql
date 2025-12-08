
-- ========================================
-- 1. surveys.session_id 백필
-- ========================================

-- 2025년 7차 영업 BS 집체교육 설문들에 session_id 설정
UPDATE surveys
SET session_id = 'fbee9f4f-d25a-42fc-a8fb-ba017b795a92'
WHERE education_year = 2025
  AND education_round = 7
  AND course_name = '영업 BS 집체교육'
  AND session_id IS NULL;

-- 2025년 8차 영업 BS 집체교육 설문들에 session_id 설정
UPDATE surveys
SET session_id = '7261312a-72c4-442f-9b77-798d0e592b18'
WHERE education_year = 2025
  AND education_round = 8
  AND course_name = '영업 BS 집체교육'
  AND session_id IS NULL;

-- 전체 surveys에 대해 program_sessions_v1과 매칭하여 session_id 백필
UPDATE surveys s
SET session_id = psv.session_id
FROM program_sessions_v1 psv
WHERE s.session_id IS NULL
  AND s.education_year = psv.year
  AND s.education_round = psv.turn
  AND s.course_name = psv.program;

-- ========================================
-- 2. 자동 session_id 매핑 트리거 생성
-- ========================================

-- 트리거 함수: survey INSERT/UPDATE 시 session_id 자동 설정
CREATE OR REPLACE FUNCTION auto_set_survey_session_id()
RETURNS TRIGGER AS $$
BEGIN
  -- session_id가 이미 설정되어 있으면 그대로 유지
  IF NEW.session_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- education_year, education_round, course_name으로 program_sessions_v1에서 session_id 찾기
  IF NEW.education_year IS NOT NULL 
     AND NEW.education_round IS NOT NULL 
     AND NEW.course_name IS NOT NULL THEN
    
    SELECT psv.session_id INTO NEW.session_id
    FROM program_sessions_v1 psv
    WHERE psv.year = NEW.education_year
      AND psv.turn = NEW.education_round
      AND psv.program = NEW.course_name
    LIMIT 1;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (INSERT와 UPDATE 모두)
DROP TRIGGER IF EXISTS trigger_auto_set_survey_session_id ON surveys;
CREATE TRIGGER trigger_auto_set_survey_session_id
  BEFORE INSERT OR UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_survey_session_id();

-- 백필 완료 확인용 주석
COMMENT ON FUNCTION auto_set_survey_session_id IS 'Automatically sets session_id for surveys based on year, round, and course_name from program_sessions_v1';
