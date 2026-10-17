-- ==============================================================================
-- PharmaStudents.com — Supabase Database Migration
-- Project: tfganiacycmmnorfyqam
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
--    Stores all user info for both admins and students.
--    Linked 1:1 to Supabase Auth users via UUID.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  full_name     TEXT        NOT NULL DEFAULT '',
  mobile        TEXT,
  college       TEXT,
  year          INTEGER     CHECK (year BETWEEN 1 AND 4),
  semester      INTEGER     CHECK (semester BETWEEN 1 AND 8),
  role          TEXT        NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  avatar_url    TEXT,
  disabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
--    When a student registers via the app's register page, this trigger
--    automatically inserts their profile row with data from signup metadata.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, mobile, college, year, semester, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'college',
    NULLIF(NEW.raw_user_meta_data->>'year', '')::INTEGER,
    NULLIF(NEW.raw_user_meta_data->>'semester', '')::INTEGER,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow reading profiles
DROP POLICY IF EXISTS "Allow select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Allow select profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow profile insert (for registration)
DROP POLICY IF EXISTS "Allow insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Allow insert profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DEDICATED ADMINS TABLE (Separate table for admin credentials)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  name          TEXT        NOT NULL DEFAULT 'Administrator',
  phone         TEXT        DEFAULT '7801064412',
  role          TEXT        NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read admins for login" ON public.admins;
CREATE POLICY "Allow read admins for login"
  ON public.admins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin management" ON public.admins;
CREATE POLICY "Allow admin management"
  ON public.admins FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert Default Admin (siddu@gmail.com / Siddu@2026)
INSERT INTO public.admins (username, email, password_hash, name, phone, role)
VALUES (
  'siddu',
  'siddu@gmail.com',
  '54824f31b20b01faaa213f6b8ef886dcef878e456de3efaecc9be17a0432e58f',
  'Siddu Admin',
  '7801064412',
  'admin'
)
ON CONFLICT (email) DO UPDATE 
SET password_hash = '54824f31b20b01faaa213f6b8ef886dcef878e456de3efaecc9be17a0432e58f',
    name = 'Siddu Admin',
    role = 'admin';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GRANT PERMISSIONS TO SUPABASE ROLES
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.admins TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_role_idx  ON public.profiles (role);
CREATE INDEX IF NOT EXISTS admins_email_idx    ON public.admins (email);
CREATE INDEX IF NOT EXISTS admins_username_idx ON public.admins (username);


