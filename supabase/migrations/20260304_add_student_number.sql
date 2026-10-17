-- ==============================================================================
-- PharmaStudents.com — Migration: 6-Digit Student ID & Profile Constraints
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- 1. Create 6-digit Sequence starting at 100001
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq
  START WITH 100001
  INCREMENT BY 1
  MINVALUE 100001
  MAXVALUE 999999
  CYCLE;

-- Grant permissions to sequence
GRANT USAGE, SELECT ON SEQUENCE public.student_id_seq TO anon, authenticated, service_role;

-- 2. Add student_number column to public.profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'student_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN student_number TEXT UNIQUE;
  END IF;
END $$;

-- 3. Create or replace function to auto-assign 6-digit student number
CREATE OR REPLACE FUNCTION public.assign_student_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only assign 6-digit student ID to students, never to admins
  IF NEW.role = 'student' AND (NEW.student_number IS NULL OR trim(NEW.student_number) = '') THEN
    NEW.student_number := nextval('public.student_id_seq')::TEXT;
  ELSIF NEW.role = 'admin' THEN
    NEW.student_number := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create trigger to automatically assign student_number on INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_assign_student_number ON public.profiles;
CREATE TRIGGER trigger_assign_student_number
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_student_number();

-- 5. Backfill existing students with unique 6-digit Student IDs
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id FROM public.profiles 
    WHERE role = 'student' AND (student_number IS NULL OR trim(student_number) = '')
    ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles
    SET student_number = nextval('public.student_id_seq')::TEXT
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 6. Add Index for rapid lookups on student_number
CREATE INDEX IF NOT EXISTS idx_profiles_student_number ON public.profiles (student_number);
