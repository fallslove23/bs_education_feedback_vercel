-- 사용자별 필터 설정 저장 테이블
CREATE TABLE public.user_filter_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('survey_analysis', 'survey_results', 'survey_management')),
  filter_data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preset_name, filter_type)
);

-- RLS 정책 설정
ALTER TABLE public.user_filter_presets ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프리셋만 볼 수 있음
CREATE POLICY "Users can view their own presets"
ON public.user_filter_presets
FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 프리셋만 생성할 수 있음
CREATE POLICY "Users can create their own presets"
ON public.user_filter_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 프리셋만 수정할 수 있음
CREATE POLICY "Users can update their own presets"
ON public.user_filter_presets
FOR UPDATE
USING (auth.uid() = user_id);

-- 사용자는 자신의 프리셋만 삭제할 수 있음
CREATE POLICY "Users can delete their own presets"
ON public.user_filter_presets
FOR DELETE
USING (auth.uid() = user_id);

-- 이메일 수신자 프리셋 저장 테이블
CREATE TABLE public.email_recipient_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preset_name)
);

-- RLS 정책 설정
ALTER TABLE public.email_recipient_presets ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 수신자 프리셋만 볼 수 있음
CREATE POLICY "Users can view their own recipient presets"
ON public.email_recipient_presets
FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 수신자 프리셋만 생성할 수 있음
CREATE POLICY "Users can create their own recipient presets"
ON public.email_recipient_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 수신자 프리셋만 수정할 수 있음
CREATE POLICY "Users can update their own recipient presets"
ON public.email_recipient_presets
FOR UPDATE
USING (auth.uid() = user_id);

-- 사용자는 자신의 수신자 프리셋만 삭제할 수 있음
CREATE POLICY "Users can delete their own recipient presets"
ON public.email_recipient_presets
FOR DELETE
USING (auth.uid() = user_id);

-- 업데이트 트리거 추가
CREATE TRIGGER update_user_filter_presets_updated_at
  BEFORE UPDATE ON public.user_filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_recipient_presets_updated_at
  BEFORE UPDATE ON public.email_recipient_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();