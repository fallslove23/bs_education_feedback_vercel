-- sethetrend87@osstem.com 계정에 admin 역할 추가
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.user_role 
FROM public.profiles 
WHERE email = 'sethetrend87@osstem.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = profiles.id AND role = 'admin'
);