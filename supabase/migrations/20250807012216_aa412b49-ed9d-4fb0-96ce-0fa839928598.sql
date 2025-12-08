-- sethetrend87@osstem.com 계정에 admin 역할을 다시 추가 (강제 삽입)
INSERT INTO public.user_roles (user_id, role)
VALUES ('abb07630-66e1-4ed2-a102-e5b8e8e354ec', 'admin'::public.user_role)
ON CONFLICT (user_id, role) DO NOTHING;