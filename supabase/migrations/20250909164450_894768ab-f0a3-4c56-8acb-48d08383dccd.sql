-- Fix RLS for course_name_to_session_map table
ALTER TABLE public.course_name_to_session_map ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for course_name_to_session_map
CREATE POLICY "Everyone can view course name mapping" 
ON public.course_name_to_session_map 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and operators can manage course name mapping" 
ON public.course_name_to_session_map 
FOR ALL 
USING (is_admin() OR is_operator())
WITH CHECK (is_admin() OR is_operator());

-- Fix potential user role conflicts by ensuring proper role management
-- Remove any duplicate role entries for the same user (if any exist)
DELETE FROM public.user_roles ur1 
USING public.user_roles ur2 
WHERE ur1.id > ur2.id 
AND ur1.user_id = ur2.user_id 
AND ur1.role = ur2.role;

-- Add constraint to prevent duplicate user-role combinations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_role_key' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;