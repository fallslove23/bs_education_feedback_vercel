-- Create missing instructor record for test@osstem.com
INSERT INTO public.instructors (id, name, email, created_at, updated_at)
VALUES (
  '467c58c9-4d44-4cf7-8151-b82e6ea39c19',
  '테스트 강사',
  'test@osstem.com',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = now();