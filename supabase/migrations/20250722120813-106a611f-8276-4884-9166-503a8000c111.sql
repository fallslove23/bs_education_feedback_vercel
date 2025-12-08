-- Add new roles to the system
-- First, let's see current role values and update them

-- Update the role column to support new roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'instructor', 'user'));

-- Update sethetrend87@osstem.com to admin role
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'sethetrend87@osstem.com';

-- If the user doesn't exist yet, create a placeholder profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT gen_random_uuid(), 'sethetrend87@osstem.com', 'admin', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'sethetrend87@osstem.com'
);