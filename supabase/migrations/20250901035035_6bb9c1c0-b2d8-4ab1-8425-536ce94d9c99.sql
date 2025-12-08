-- 기존 설문들의 education_day 값이 null인 경우 기본값 1로 설정
UPDATE public.surveys 
SET education_day = 1 
WHERE education_day IS NULL;