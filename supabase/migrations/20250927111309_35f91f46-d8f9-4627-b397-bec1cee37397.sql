-- Fix search_path for functions that don't have it set properly
-- Update functions to have proper search_path settings

CREATE OR REPLACE FUNCTION public.generate_survey_code(length integer DEFAULT 8)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing characters
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_short_code(length integer DEFAULT 6)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; -- 혼동하기 쉬운 문자 제외
    result TEXT := '';
    i INT;
    max_attempts INT := 100;
    attempt INT := 0;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..length LOOP
            result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
        END LOOP;
        
        -- 중복 확인
        IF NOT EXISTS (SELECT 1 FROM public.short_urls WHERE short_code = result) THEN
            EXIT;
        END IF;
        
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique short code after % attempts', max_attempts;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_survey_responses_by_date_range(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS TABLE(response_id uuid, survey_id uuid, submitted_at timestamp with time zone, respondent_email text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.survey_id,
    sr.submitted_at,
    sr.respondent_email
  FROM public.survey_responses sr
  WHERE 
    CASE 
      WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
        sr.submitted_at >= start_date::timestamp AND sr.submitted_at <= end_date::timestamp
      WHEN start_date IS NOT NULL THEN
        sr.submitted_at >= start_date::timestamp
      WHEN end_date IS NOT NULL THEN
        sr.submitted_at <= end_date::timestamp
      ELSE TRUE
    END
  ORDER BY sr.submitted_at DESC;
END;
$function$;