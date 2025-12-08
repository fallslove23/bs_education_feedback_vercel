-- Normalize legacy course_statistics records where course_name stored status text
DO $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Swap back any rows where status held the actual course name
  UPDATE public.course_statistics
  SET course_name = status,
      status = COALESCE(NULLIF(course_name, ''), '완료'),
      updated_at = v_now
  WHERE course_name IN ('완료', '진행 중', '진행 예정', '취소')
    AND status NOT IN ('완료', '진행 중', '진행 예정', '취소')
    AND status IS NOT NULL;

  -- Ensure status column only contains allowed values
  UPDATE public.course_statistics
  SET status = '완료',
      updated_at = v_now
  WHERE status IS NULL
     OR status NOT IN ('완료', '진행 중', '진행 예정', '취소');

  -- Backfill readable course names for rows that still contain status placeholders
  UPDATE public.course_statistics
  SET course_name = CONCAT(year, '년 ', LPAD(round::text, 2, '0'), '차 영업 과정'),
      updated_at = v_now
  WHERE course_name IS NULL
     OR TRIM(course_name) = ''
     OR course_name IN ('완료', '진행 중', '진행 예정', '취소');
END;
$$;
