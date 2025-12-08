-- Fix the create_instructor_account function to properly create user accounts
-- This function will create a profile entry that will be linked when the instructor signs up

CREATE OR REPLACE FUNCTION public.create_instructor_account(instructor_email text, instructor_password text, instructor_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Create a placeholder profile that will be updated when the instructor signs up
  INSERT INTO public.profiles (id, email, role, instructor_id, first_login, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    instructor_email,
    'instructor',
    instructor_id_param,
    true,
    NOW(),
    NOW()
  );
  
  RETURN 'Instructor profile created. The instructor should sign up at the login page using email: ' || instructor_email || ' and any password they choose. Their account will be automatically linked.';
END;
$function$;

-- Update the trigger function to handle instructor linking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  existing_instructor_profile record;
BEGIN
  -- Check if there's already a profile for this email with instructor_id set
  SELECT * INTO existing_instructor_profile 
  FROM public.profiles 
  WHERE email = NEW.email AND instructor_id IS NOT NULL;
  
  IF existing_instructor_profile.id IS NOT NULL THEN
    -- Update the existing profile with the new user's auth ID
    UPDATE public.profiles 
    SET 
      id = NEW.id,
      updated_at = NOW()
    WHERE email = NEW.email AND instructor_id IS NOT NULL;
  ELSE
    -- Insert new profile for regular users
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
  END IF;
  
  RETURN NEW;
END;
$function$;