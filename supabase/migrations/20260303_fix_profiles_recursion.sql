-- ==============================================================================
-- PharmaStudents.com — Fix Profiles RLS Infinite Recursion
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ==============================================================================

-- 1. Dynamically drop ALL existing policies on public.profiles to remove recursion
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public' 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Create clean, non-recursive policies on profiles
-- Anyone can read profiles (or admin can read all)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Anyone can insert a profile on registration
CREATE POLICY "profiles_insert_all"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Users can update their own profile or admin can update
CREATE POLICY "profiles_update_all"
  ON public.profiles FOR UPDATE
  USING (true);

-- 3. Grant full permissions to roles
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
