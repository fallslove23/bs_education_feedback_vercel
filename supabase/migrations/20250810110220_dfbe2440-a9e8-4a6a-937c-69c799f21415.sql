-- Clean up duplicate profiles - remove the orphaned profile that doesn't exist in auth.users
DELETE FROM public.profiles 
WHERE email = 'ainura624@osstem.com' 
AND id NOT IN (SELECT id FROM auth.users WHERE email = 'ainura624@osstem.com');

-- Add constraint to prevent future orphaned profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_exists_in_auth_users'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_exists_in_auth_users 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;