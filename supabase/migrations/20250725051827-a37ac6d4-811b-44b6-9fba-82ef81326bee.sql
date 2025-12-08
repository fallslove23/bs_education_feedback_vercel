-- 기존 함수 수정: placeholder 방식이 아닌 실제 회원가입 시 연결되도록 변경
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
  
  -- 실제 placeholder 생성 대신, instructors 테이블에 표시만 하고 실제 회원가입 시 연결되도록 처리
  -- instructors 테이블의 email이 설정되어 있으면 준비가 된 것으로 간주
  UPDATE public.instructors 
  SET email = instructor_email, updated_at = NOW()
  WHERE id = instructor_id_param;
  
  RETURN 'Instructor email updated. The instructor should sign up at the login page using email: ' || instructor_email || ' and any password they choose. Their account will be automatically linked upon signup.';
END;
$function$;

-- handle_new_user 함수도 수정하여 회원가입 시 강사 연결이 제대로 되도록 수정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  instructor_record record;
BEGIN
  -- Check if there's an instructor with this email
  SELECT * INTO instructor_record 
  FROM public.instructors 
  WHERE email = NEW.email;
  
  IF instructor_record.id IS NOT NULL THEN
    -- Insert new profile for instructor
    INSERT INTO public.profiles (id, email, role, instructor_id, first_login)
    VALUES (NEW.id, NEW.email, 'instructor', instructor_record.id, true);
  ELSE
    -- Insert new profile for regular users
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
  END IF;
  
  RETURN NEW;
END;
$function$;