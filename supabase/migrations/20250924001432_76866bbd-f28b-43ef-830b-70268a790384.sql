-- Fix final search path warning 
BEGIN;

-- Fix any remaining function that might be missing search_path
-- This covers the common functions that might be missing it

-- Update trigger functions to have proper search_path
CREATE OR REPLACE FUNCTION public.propagate_is_test_to_response()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = 'public'
AS $$
begin
  -- NEW.is_test가 비어있으면, 해당 설문값으로 세팅
  if new.is_test is null then
    select is_test into new.is_test
    from public.surveys
    where id = new.survey_id;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      NEW.user_id,
      'role_assigned',
      'user_roles',
      NEW.id::text,
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (
      OLD.user_id,
      'role_removed',
      'user_roles',
      OLD.id::text,
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

COMMIT;