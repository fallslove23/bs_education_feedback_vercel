-- 짧은 URL을 저장할 테이블 생성
CREATE TABLE public.short_urls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code text NOT NULL UNIQUE,
  original_url text NOT NULL,
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  click_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- 짧은 코드에 대한 인덱스 생성
CREATE INDEX idx_short_urls_short_code ON public.short_urls(short_code);
CREATE INDEX idx_short_urls_survey_id ON public.short_urls(survey_id);

-- RLS 정책 설정
ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

-- 관리자와 운영자는 모든 짧은 URL을 관리할 수 있음
CREATE POLICY "Admins and operators can manage short URLs" 
ON public.short_urls 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- 모든 사용자가 활성화된 짧은 URL을 조회할 수 있음 (리다이렉트용)
CREATE POLICY "Anyone can view active short URLs" 
ON public.short_urls 
FOR SELECT 
USING (is_active = true);

-- 짧은 URL 클릭 수 업데이트를 위한 정책
CREATE POLICY "Anyone can update click count" 
ON public.short_urls 
FOR UPDATE 
USING (is_active = true)
WITH CHECK (is_active = true);

-- 짧은 코드 생성 함수
CREATE OR REPLACE FUNCTION public.generate_short_code(length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
AS $$
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
$$;