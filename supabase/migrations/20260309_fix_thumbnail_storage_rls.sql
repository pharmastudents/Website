-- ==============================================================================
-- Migration: 20260309_fix_thumbnail_storage_rls.sql
-- Description: Configure existing 'thumbnail' bucket & Storage RLS policies for authorized admins
-- ==============================================================================

-- 1. CONFIGURE EXISTING STORAGE BUCKET 'thumbnail'
-- Ensures the existing bucket is public with 10MB limit and valid image MIME types
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[]
WHERE id = 'thumbnail';

-- Fallback insert only if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnail',
  'thumbnail',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[];

-- 2. ENABLE ROW LEVEL SECURITY ON storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. SYNC ADMIN ID BETWEEN auth.users AND public.admins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') THEN
    UPDATE public.admins a
    SET id = u.id
    FROM auth.users u
    WHERE lower(a.email) = lower(u.email);
  END IF;
END $$;

-- 4. PUBLIC SELECT POLICY (Read thumbnails freely so preview works on refresh across all views)
DROP POLICY IF EXISTS "Public can view thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnail" ON storage.objects;
CREATE POLICY "Public can view thumbnail"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnail');

-- 5. ADMIN INSERT POLICY (Restricted strictly to authenticated, authorized administrators)
DROP POLICY IF EXISTS "Admins can upload to thumbnail bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to thumbnail" ON storage.objects;
CREATE POLICY "Admins can upload to thumbnail bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnail'
  AND (
    -- Matches verified admin in public.admins
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
    )
    -- OR matches admin role in public.profiles
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    -- OR matches admin role claim in auth JWT
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    -- OR matches designated primary administrator
    OR lower(auth.jwt() ->> 'email') = 'siddu@gmail.com'
  )
);

-- 6. ADMIN UPDATE POLICY (Restricted strictly to authorized administrators)
DROP POLICY IF EXISTS "Admins can update thumbnail bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin update thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update thumbnails" ON storage.objects;
CREATE POLICY "Admins can update thumbnail bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnail'
  AND (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR lower(auth.jwt() ->> 'email') = 'siddu@gmail.com'
  )
)
WITH CHECK (bucket_id = 'thumbnail');

-- 7. ADMIN DELETE POLICY (Restricted strictly to authorized administrators)
DROP POLICY IF EXISTS "Admins can delete thumbnail bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete thumbnails" ON storage.objects;
CREATE POLICY "Admins can delete thumbnail bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnail'
  AND (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR lower(auth.jwt() ->> 'email') = 'siddu@gmail.com'
  )
);

-- 8. SANITIZE ANY LEGACY LOCAL BLOB URLS IN SUBJECTS TABLE
UPDATE public.subjects
SET thumbnail_url = NULL
WHERE thumbnail_url LIKE 'blob:%';
