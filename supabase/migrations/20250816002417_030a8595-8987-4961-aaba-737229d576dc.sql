-- Create function to get email logs for UI (workaround for types issue)
CREATE OR REPLACE FUNCTION get_email_logs()
RETURNS TABLE (
  id uuid,
  survey_id uuid,
  recipients text[],
  status text,
  sent_count integer,
  failed_count integer,
  results jsonb,
  error text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    el.id,
    el.survey_id,
    el.recipients,
    el.status,
    el.sent_count,
    el.failed_count,
    el.results,
    el.error,
    el.created_at
  FROM public.email_logs el
  WHERE (public.is_admin() OR public.is_operator() OR public.is_director())
  ORDER BY el.created_at DESC;
$$;