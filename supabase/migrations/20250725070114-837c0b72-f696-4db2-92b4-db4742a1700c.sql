-- Completely fix infinite recursion by simplifying RLS policies

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users cannot update role field" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create a simple, non-recursive approach
-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile excluding role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow the handle_new_user function to insert profiles
CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Create a separate admin view function that doesn't use RLS
CREATE OR REPLACE FUNCTION public.get_all_profiles_for_admin(requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  instructor_id uuid,
  first_login boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Only return data if the requesting user is an admin
  SELECT p.id, p.email, p.role, p.instructor_id, p.first_login, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = requesting_user_id
    AND requesting_user_id IN (
      SELECT pr.id FROM public.profiles pr WHERE pr.role = 'admin' AND pr.id = requesting_user_id
    )
  );
$$;