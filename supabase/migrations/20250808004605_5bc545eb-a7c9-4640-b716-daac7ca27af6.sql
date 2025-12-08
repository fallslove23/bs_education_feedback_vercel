-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.survey_analysis_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_analysis_comments ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent) using dynamic SQL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='survey_analysis_comments' AND policyname='View comments') THEN
    EXECUTE 'CREATE POLICY "View comments" ON public.survey_analysis_comments FOR SELECT USING (
      is_admin() OR is_operator() OR is_director() OR (
        survey_id IN (
          SELECT s.id FROM public.surveys s JOIN public.profiles p ON p.instructor_id = s.instructor_id WHERE p.id = auth.uid()
        )
      )
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='survey_analysis_comments' AND policyname='Insert comments') THEN
    EXECUTE 'CREATE POLICY "Insert comments" ON public.survey_analysis_comments FOR INSERT WITH CHECK (
      (is_admin() OR is_operator() OR is_director() OR is_instructor()) AND author_id = auth.uid()
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='survey_analysis_comments' AND policyname='Update own or admin') THEN
    EXECUTE 'CREATE POLICY "Update own or admin" ON public.survey_analysis_comments FOR UPDATE USING (
      author_id = auth.uid() OR is_admin() OR is_operator() OR is_director()
    ) WITH CHECK (
      author_id = auth.uid() OR is_admin() OR is_operator() OR is_director()
    )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='survey_analysis_comments' AND policyname='Delete own or admin') THEN
    EXECUTE 'CREATE POLICY "Delete own or admin" ON public.survey_analysis_comments FOR DELETE USING (
      author_id = auth.uid() OR is_admin() OR is_operator() OR is_director()
    )';
  END IF;
END$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_survey_analysis_comments_updated_at ON public.survey_analysis_comments;
CREATE TRIGGER trg_survey_analysis_comments_updated_at
BEFORE UPDATE ON public.survey_analysis_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure admin role for sethetrend87@osstem.com
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email ILIKE 'sethetrend87@osstem.com' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = admin_uid AND role = 'admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin');
    END IF;
  END IF;
END$$;