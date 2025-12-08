-- =========================================
-- 보완: session 기반 다대다 매핑 및 강사 통계 함수 개선
-- =========================================

-- 1) survey_sessions → survey_instructors 동기화 트리거
CREATE OR REPLACE FUNCTION public.sync_survey_instructor_from_sessions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.instructor_id IS NOT NULL THEN
      INSERT INTO public.survey_instructors (survey_id, instructor_id)
      VALUES (NEW.survey_id, NEW.instructor_id)
      ON CONFLICT (survey_id, instructor_id) DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
      IF OLD.instructor_id IS NOT NULL THEN
        DELETE FROM public.survey_instructors
        WHERE survey_id = NEW.survey_id AND instructor_id = OLD.instructor_id;
      END IF;
      IF NEW.instructor_id IS NOT NULL THEN
        INSERT INTO public.survey_instructors (survey_id, instructor_id)
        VALUES (NEW.survey_id, NEW.instructor_id)
        ON CONFLICT (survey_id, instructor_id) DO NOTHING;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.instructor_id IS NOT NULL THEN
      DELETE FROM public.survey_instructors
      WHERE survey_id = OLD.survey_id AND instructor_id = OLD.instructor_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_survey_instructor_from_sessions_ins ON public.survey_sessions;
CREATE TRIGGER trg_sync_survey_instructor_from_sessions_ins
AFTER INSERT ON public.survey_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_survey_instructor_from_sessions();

DROP TRIGGER IF EXISTS trg_sync_survey_instructor_from_sessions_upd ON public.survey_sessions;
CREATE TRIGGER trg_sync_survey_instructor_from_sessions_upd
AFTER UPDATE OF instructor_id ON public.survey_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_survey_instructor_from_sessions();

DROP TRIGGER IF EXISTS trg_sync_survey_instructor_from_sessions_del ON public.survey_sessions;
CREATE TRIGGER trg_sync_survey_instructor_from_sessions_del
AFTER DELETE ON public.survey_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_survey_instructor_from_sessions();

-- 2) 백필: survey_sessions → survey_instructors
INSERT INTO public.survey_instructors (survey_id, instructor_id)
SELECT ss.survey_id, ss.instructor_id
FROM public.survey_sessions ss
WHERE ss.instructor_id IS NOT NULL
ON CONFLICT (survey_id, instructor_id) DO NOTHING;

-- 3) 강사 통계 함수 개선: 다대다 매핑 반영
CREATE OR REPLACE FUNCTION public.get_instructor_stats_optimized(
  instructor_id_param uuid DEFAULT NULL,
  education_year_param integer DEFAULT NULL
)
RETURNS TABLE(
  instructor_id uuid,
  education_year integer,
  education_round integer,
  survey_count bigint,
  total_responses bigint,
  avg_satisfaction numeric
) LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH all_instructor_surveys AS (
    SELECT s.id AS survey_id, s.instructor_id
    FROM public.surveys s
    WHERE s.instructor_id IS NOT NULL
    UNION
    SELECT ss.survey_id, ss.instructor_id
    FROM public.survey_sessions ss
    WHERE ss.instructor_id IS NOT NULL
    UNION
    SELECT si.survey_id, si.instructor_id
    FROM public.survey_instructors si
    WHERE si.instructor_id IS NOT NULL
  ),
  scoped AS (
    SELECT 
      ais.instructor_id,
      s.id AS survey_id,
      s.education_year,
      s.education_round
    FROM all_instructor_surveys ais
    JOIN public.surveys s ON s.id = ais.survey_id
    WHERE (instructor_id_param IS NULL OR ais.instructor_id = instructor_id_param)
      AND (education_year_param IS NULL OR s.education_year = education_year_param)
  ),
  joined AS (
    SELECT 
      sc.instructor_id,
      sc.education_year,
      sc.education_round,
      sc.survey_id,
      sr.id AS response_id,
      qa.answer_value,
      sq.satisfaction_type,
      sq.question_type
    FROM scoped sc
    LEFT JOIN public.survey_responses sr ON sr.survey_id = sc.survey_id
    LEFT JOIN public.question_answers qa ON qa.response_id = sr.id
    LEFT JOIN public.survey_questions sq ON sq.id = qa.question_id
  )
  SELECT 
    j.instructor_id,
    j.education_year,
    j.education_round,
    COUNT(DISTINCT j.survey_id) AS survey_count,
    COUNT(DISTINCT j.response_id) AS total_responses,
    AVG(
      CASE 
        WHEN j.satisfaction_type = 'instructor' AND j.question_type IN ('rating','scale') THEN
          CASE 
            WHEN jsonb_typeof(j.answer_value) = 'number' THEN
              CASE WHEN (j.answer_value::text)::numeric <= 5 THEN (j.answer_value::text)::numeric * 2
                   ELSE (j.answer_value::text)::numeric END
            WHEN jsonb_typeof(j.answer_value) = 'string' AND (j.answer_value #>> '{}') ~ '^[0-9]+(\.[0-9]+)?$' THEN
              CASE WHEN ((j.answer_value #>> '{}')::numeric) <= 5 THEN ((j.answer_value #>> '{}')::numeric) * 2
                   ELSE (j.answer_value #>> '{}')::numeric END
            ELSE NULL
          END
        ELSE NULL
      END
    ) AS avg_satisfaction
  FROM joined j
  GROUP BY j.instructor_id, j.education_year, j.education_round
  ORDER BY j.education_year DESC, j.education_round DESC;
END;
$$;
