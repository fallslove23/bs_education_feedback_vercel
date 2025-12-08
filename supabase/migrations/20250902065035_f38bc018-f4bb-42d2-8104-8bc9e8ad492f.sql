-- Create anonymous sessions table
CREATE TABLE public.anon_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anon_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent_hash TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey tokens table for one-time access codes
CREATE TABLE public.survey_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_anon_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create survey completions table to track anonymous participation
CREATE TABLE public.survey_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL,
  anon_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  UNIQUE(survey_id, anon_id)
);

-- Enable RLS on all tables
ALTER TABLE public.anon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for anon_sessions (system managed)
CREATE POLICY "System can manage anon sessions" 
ON public.anon_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS policies for survey_tokens
CREATE POLICY "Anyone can read unused tokens" 
ON public.survey_tokens 
FOR SELECT 
USING (used_at IS NULL);

CREATE POLICY "Admins can manage tokens" 
ON public.survey_tokens 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

CREATE POLICY "System can update token usage" 
ON public.survey_tokens 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- RLS policies for survey_completions
CREATE POLICY "Anyone can insert completions" 
ON public.survey_completions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read completions for validation" 
ON public.survey_completions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can view all completions" 
ON public.survey_completions 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- Add foreign key constraints
ALTER TABLE public.survey_tokens 
ADD CONSTRAINT fk_survey_tokens_survey_id 
FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE public.survey_tokens 
ADD CONSTRAINT fk_survey_tokens_anon_id 
FOREIGN KEY (used_by_anon_id) REFERENCES public.anon_sessions(anon_id) ON DELETE SET NULL;

ALTER TABLE public.survey_completions 
ADD CONSTRAINT fk_survey_completions_survey_id 
FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE public.survey_completions 
ADD CONSTRAINT fk_survey_completions_anon_id 
FOREIGN KEY (anon_id) REFERENCES public.anon_sessions(anon_id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_survey_tokens_code ON public.survey_tokens(code);
CREATE INDEX idx_survey_tokens_survey_id ON public.survey_tokens(survey_id);
CREATE INDEX idx_survey_completions_survey_anon ON public.survey_completions(survey_id, anon_id);
CREATE INDEX idx_survey_completions_ip ON public.survey_completions(ip_address, completed_at);

-- Function to generate random codes
CREATE OR REPLACE FUNCTION generate_survey_code(length INT DEFAULT 8)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;