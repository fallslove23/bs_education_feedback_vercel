
-- Step 1: v_analysis_course_options_v3 뷰를 수정하여 surveys 테이블에서 직접 집계
DROP VIEW IF EXISTS v_analysis_course_options_v3 CASCADE;

CREATE OR REPLACE VIEW v_analysis_course_options_v3 AS
WITH survey_programs AS (
  SELECT 
    s.education_year AS year,
    COALESCE(p.id, gen_random_uuid()) AS program_id,
    COALESCE(p.name, s.course_name) AS program_name,
    s.education_round AS turn,
    s.id AS survey_id,
    -- session_id가 있으면 해당 session의 turn 사용, 없으면 survey의 education_round 사용
    COALESCE(
      (SELECT ss.turn FROM sessions ss WHERE ss.id = s.session_id),
      s.education_round
    ) AS effective_turn
  FROM surveys s
  LEFT JOIN sessions sess ON sess.id = s.session_id
  LEFT JOIN programs p ON p.id = sess.program_id OR p.name = s.course_name
  WHERE s.education_year IS NOT NULL 
    AND s.education_round IS NOT NULL
    AND s.course_name IS NOT NULL
)
SELECT
  sp.year,
  sp.program_id,
  sp.program_name,
  COUNT(DISTINCT sp.survey_id) AS survey_count,
  COUNT(DISTINCT CASE WHEN sp.turn IS NOT NULL THEN sp.turn END) AS session_count,
  MIN(sp.effective_turn) AS min_turn,
  MAX(sp.effective_turn) AS max_turn
FROM survey_programs sp
GROUP BY sp.year, sp.program_id, sp.program_name;

-- Step 2: 설문 생성 시 자동으로 session 생성하는 함수
CREATE OR REPLACE FUNCTION auto_create_session_for_survey()
RETURNS TRIGGER AS $$
DECLARE
  v_program_id UUID;
  v_session_id UUID;
  v_session_title TEXT;
BEGIN
  -- course_name으로 program 찾기
  SELECT id INTO v_program_id
  FROM programs
  WHERE name = NEW.course_name
  LIMIT 1;

  -- program이 없으면 생성
  IF v_program_id IS NULL AND NEW.course_name IS NOT NULL THEN
    INSERT INTO programs (name, description)
    VALUES (NEW.course_name, '자동 생성된 프로그램')
    RETURNING id INTO v_program_id;
  END IF;

  -- 해당 프로그램/년도/차수의 session이 이미 있는지 확인
  IF v_program_id IS NOT NULL AND NEW.education_year IS NOT NULL AND NEW.education_round IS NOT NULL THEN
    SELECT id INTO v_session_id
    FROM sessions
    WHERE program_id = v_program_id
      AND year = NEW.education_year
      AND turn = NEW.education_round
    LIMIT 1;

    -- session이 없으면 생성
    IF v_session_id IS NULL THEN
      v_session_title := NEW.education_year || '년 ' || NEW.education_round || '차 ' || NEW.course_name;
      
      INSERT INTO sessions (program_id, year, turn, title)
      VALUES (v_program_id, NEW.education_year, NEW.education_round, v_session_title)
      RETURNING id INTO v_session_id;
    END IF;

    -- survey의 session_id 업데이트 (INSERT 시에만)
    IF TG_OP = 'INSERT' AND NEW.session_id IS NULL THEN
      NEW.session_id := v_session_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: 트리거 생성 (INSERT 전에 실행)
DROP TRIGGER IF EXISTS trg_auto_create_session_for_survey ON surveys;
CREATE TRIGGER trg_auto_create_session_for_survey
  BEFORE INSERT ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_session_for_survey();

-- Step 4: 기존 설문들의 session_id 업데이트 (session_id가 NULL인 것들)
DO $$
DECLARE
  v_survey RECORD;
  v_program_id UUID;
  v_session_id UUID;
  v_session_title TEXT;
BEGIN
  FOR v_survey IN 
    SELECT id, course_name, education_year, education_round, session_id
    FROM surveys
    WHERE session_id IS NULL
      AND course_name IS NOT NULL
      AND education_year IS NOT NULL
      AND education_round IS NOT NULL
  LOOP
    -- course_name으로 program 찾기
    SELECT id INTO v_program_id
    FROM programs
    WHERE name = v_survey.course_name
    LIMIT 1;

    -- program이 없으면 생성
    IF v_program_id IS NULL THEN
      INSERT INTO programs (name, description)
      VALUES (v_survey.course_name, '자동 생성된 프로그램')
      RETURNING id INTO v_program_id;
    END IF;

    -- 해당 프로그램/년도/차수의 session 찾기 또는 생성
    SELECT id INTO v_session_id
    FROM sessions
    WHERE program_id = v_program_id
      AND year = v_survey.education_year
      AND turn = v_survey.education_round
    LIMIT 1;

    IF v_session_id IS NULL THEN
      v_session_title := v_survey.education_year || '년 ' || v_survey.education_round || '차 ' || v_survey.course_name;
      
      INSERT INTO sessions (program_id, year, turn, title)
      VALUES (v_program_id, v_survey.education_year, v_survey.education_round, v_session_title)
      RETURNING id INTO v_session_id;
    END IF;

    -- survey 업데이트
    UPDATE surveys
    SET session_id = v_session_id
    WHERE id = v_survey.id;
  END LOOP;
END $$;
