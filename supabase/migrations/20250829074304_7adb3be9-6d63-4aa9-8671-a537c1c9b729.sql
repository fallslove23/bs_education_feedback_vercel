-- 기존 surveys 테이블에 course_name 컬럼 추가
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS course_name TEXT;