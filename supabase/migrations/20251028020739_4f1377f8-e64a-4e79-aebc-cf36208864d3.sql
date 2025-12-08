-- =========================================
-- 강사-설문 매핑 및 세션 자동 연결 시스템 (안전 검증 포함)
-- =========================================

-- 1) surveys → survey_instructors 동기화 트리거 (삽입/변경/NULL 삭제까지 커버)
CREATE OR REPLACE FUNCTION public.sync_survey_instructor_map()
RETURNS trigger AS $$
BEGIN
  -- 삭제/변경: 예전에 붙어있던 instructor 매핑 제거
  IF TG_OP = 'UPDATE' AND OLD.instructor_id IS NOT NULL AND OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
    DELETE FROM public.survey_instructors
    WHERE survey_id = NEW.id AND instructor_id = OLD.instructor_id;
  END IF;

  -- 삽입/변경: NEW.instructor_id가 존재하면 매핑 추가(중복 무시)
  IF NEW.instructor_id IS NOT NULL THEN
    INSERT INTO public.survey_instructors (survey_id, instructor_id)
    VALUES (NEW.id, NEW.instructor_id)
    ON CONFLICT (survey_id, instructor_id) DO NOTHING;
  END IF;

  -- 변경: instructor_id가 NULL로 바뀐 경우 잔여 매핑 제거(안전)
  IF TG_OP = 'UPDATE' AND NEW.instructor_id IS NULL THEN
    DELETE FROM public.survey_instructors
    WHERE survey_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_survey_instructor_map ON public.surveys;
CREATE TRIGGER trg_sync_survey_instructor_map
AFTER INSERT OR UPDATE OF instructor_id ON public.surveys
FOR EACH ROW EXECUTE FUNCTION public.sync_survey_instructor_map();


-- 2) 코스명 정규화 함수 (캐노니컬)
CREATE OR REPLACE FUNCTION public.canonicalize_course_name(name text)
RETURNS text AS $$
BEGIN
  IF name IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(btrim(regexp_replace(name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 3) course_name 변화에 따라 session_id 자동 부착(유효성 검증 포함)
CREATE OR REPLACE FUNCTION public.attach_session_from_name()
RETURNS trigger AS $$
DECLARE
  v_session uuid;
BEGIN
  -- 매핑에서 session_id 찾기
  SELECT m.session_id INTO v_session
  FROM public.course_name_to_session_map m
  WHERE public.canonicalize_course_name(m.legacy_course_name) = public.canonicalize_course_name(NEW.course_name)
  LIMIT 1;

  -- session_id가 실제 sessions 테이블에 존재하는지 검증
  IF v_session IS NOT NULL AND EXISTS (SELECT 1 FROM public.sessions WHERE id = v_session) THEN
    -- session_id가 비어있거나, 매핑값과 다르면 덮어씀
    IF NEW.session_id IS NULL OR NEW.session_id IS DISTINCT FROM v_session THEN
      NEW.session_id = v_session;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_attach_session_from_name ON public.surveys;
CREATE TRIGGER trg_attach_session_from_name
BEFORE INSERT OR UPDATE OF course_name ON public.surveys
FOR EACH ROW EXECUTE FUNCTION public.attach_session_from_name();

-- 4) 백필: surveys.instructor_id → survey_instructors
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT s.id, s.instructor_id
FROM public.surveys s
WHERE s.instructor_id IS NOT NULL
ON CONFLICT (survey_id, instructor_id) DO NOTHING;

-- 5) 백필: course_name 매핑으로 session_id 채우기 (유효성 검증 포함)
UPDATE public.surveys s
SET session_id = m.session_id
FROM public.course_name_to_session_map m
WHERE s.session_id IS NULL
  AND public.canonicalize_course_name(m.legacy_course_name) = public.canonicalize_course_name(s.course_name)
  AND EXISTS (SELECT 1 FROM public.sessions ses WHERE ses.id = m.session_id);


-- 6) 진단용 뷰(간편 점검)
CREATE OR REPLACE VIEW public.v_survey_instructor_session_resolved AS
SELECT 
  s.id   AS survey_id,
  s.title AS survey_title,
  COALESCE(s.session_id, m.session_id) AS resolved_session_id,
  si.instructor_id,
  i.name AS instructor_name,
  s.education_year,
  s.education_round,
  s.course_name,
  s.status
FROM public.surveys s
LEFT JOIN public.survey_instructors si ON si.survey_id = s.id
LEFT JOIN public.instructors i ON i.id = si.instructor_id
LEFT JOIN public.course_name_to_session_map m 
  ON public.canonicalize_course_name(m.legacy_course_name) = public.canonicalize_course_name(s.course_name)
  AND EXISTS (SELECT 1 FROM public.sessions ses WHERE ses.id = m.session_id);

GRANT SELECT ON public.v_survey_instructor_session_resolved TO anon, authenticated, service_role;