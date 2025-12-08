-- Security fixes (idempotent): function hardening and audit logging

-- 1) Harden SECURITY DEFINER functions with explicit search_path
CREATE OR REPLACE FUNCTION public.get_user_roles(target_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(role user_role)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_user_admin.user_id 
      AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_instructor_account(instructor_email text, instructor_password text, instructor_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- Check if instructor exists
  IF NOT EXISTS (SELECT 1 FROM public.instructors WHERE id = instructor_id_param) THEN
    RETURN 'Instructor not found';
  END IF;

  -- Check if email is already in use (in profiles table)
  SELECT id INTO existing_profile_id FROM public.profiles WHERE email = instructor_email;

  IF existing_profile_id IS NOT NULL THEN
    -- Check if this profile already has instructor_id set
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = existing_profile_id AND instructor_id IS NOT NULL) THEN
      RETURN 'Account already exists for this instructor';
    ELSE
      -- Update existing profile to link with instructor
      UPDATE public.profiles 
      SET 
        instructor_id = instructor_id_param,
        role = 'instructor',
        first_login = true,
        updated_at = NOW()
      WHERE id = existing_profile_id;

      RETURN 'Existing account linked to instructor. The instructor can now log in with their existing credentials.';
    END IF;
  END IF;

  -- Check if instructor_id is already linked to another profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE instructor_id = instructor_id_param) THEN
    RETURN 'This instructor is already linked to an account';
  END IF;

  -- Update instructors table with email
  UPDATE public.instructors 
  SET email = instructor_email, updated_at = NOW()
  WHERE id = instructor_id_param;

  RETURN 'Instructor email updated. The instructor should sign up at the login page using email: ' || instructor_email || ' and any password they choose. Their account will be automatically linked upon signup.';
END;
$function$;

-- 2) Audit logs for role changes (idempotent)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (safe to run repeatedly)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'audit_logs' 
      AND policyname = 'Admins can view audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (is_admin())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'audit_logs' 
      AND policyname = 'System can insert audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true)';
  END IF;
END$$;

-- Create or replace audit function (safe)
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

-- Recreate trigger idempotently
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();