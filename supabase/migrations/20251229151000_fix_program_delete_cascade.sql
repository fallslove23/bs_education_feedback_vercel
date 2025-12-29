-- Fix referential integrity error when deleting programs (courses)
-- Change foreign key constraint from sessions table to cascade delete

ALTER TABLE public.sessions
DROP CONSTRAINT IF EXISTS sessions_program_id_fkey;

ALTER TABLE public.sessions
ADD CONSTRAINT sessions_program_id_fkey
FOREIGN KEY (program_id)
REFERENCES public.programs(id)
ON DELETE CASCADE;
