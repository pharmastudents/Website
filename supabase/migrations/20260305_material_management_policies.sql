-- ==============================================================================
-- PharmaStudents.com — Migration: Material, Course, Semester, Subject, Unit RLS & Policies
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- 1. Ensure default UUID generation on all primary key columns
ALTER TABLE public.courses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.academic_years ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.semesters ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.subjects ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.units ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.materials ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Ensure columns exist on materials for unit selection and security settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'unit_number') THEN
    ALTER TABLE public.materials ADD COLUMN unit_number INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'unit_label') THEN
    ALTER TABLE public.materials ADD COLUMN unit_label TEXT DEFAULT 'Unit 1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'course_id') THEN
    ALTER TABLE public.materials ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'semester_id') THEN
    ALTER TABLE public.materials ADD COLUMN semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'downloads_count') THEN
    ALTER TABLE public.materials ADD COLUMN downloads_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'allow_download') THEN
    ALTER TABLE public.materials ADD COLUMN allow_download BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'allow_print') THEN
    ALTER TABLE public.materials ADD COLUMN allow_print BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'add_watermark') THEN
    ALTER TABLE public.materials ADD COLUMN add_watermark BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'visible_to') THEN
    ALTER TABLE public.materials ADD COLUMN visible_to TEXT DEFAULT 'all';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'cover_image_url') THEN
    ALTER TABLE public.materials ADD COLUMN cover_image_url TEXT;
  END IF;
END $$;

-- 2. Enable RLS and setup permissive policies for admin operations on academic tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_all" ON public.courses;
DROP POLICY IF EXISTS "courses_manage_admin" ON public.courses;
DROP POLICY IF EXISTS "courses_manage_all" ON public.courses;
CREATE POLICY "courses_select_all" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses_manage_all" ON public.courses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "years_select_all" ON public.academic_years;
DROP POLICY IF EXISTS "years_manage_admin" ON public.academic_years;
DROP POLICY IF EXISTS "years_manage_all" ON public.academic_years;
CREATE POLICY "years_select_all" ON public.academic_years FOR SELECT USING (true);
CREATE POLICY "years_manage_all" ON public.academic_years FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "semesters_select_all" ON public.semesters;
DROP POLICY IF EXISTS "semesters_manage_admin" ON public.semesters;
DROP POLICY IF EXISTS "semesters_manage_all" ON public.semesters;
CREATE POLICY "semesters_select_all" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "semesters_manage_all" ON public.semesters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "subjects_select_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_manage_admin" ON public.subjects;
DROP POLICY IF EXISTS "subjects_manage_all" ON public.subjects;
CREATE POLICY "subjects_select_all" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_manage_all" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "units_select_all" ON public.units;
DROP POLICY IF EXISTS "units_manage_admin" ON public.units;
DROP POLICY IF EXISTS "units_manage_all" ON public.units;
CREATE POLICY "units_select_all" ON public.units FOR SELECT USING (true);
CREATE POLICY "units_manage_all" ON public.units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "materials_select_all" ON public.materials;
DROP POLICY IF EXISTS "materials_manage_admin" ON public.materials;
DROP POLICY IF EXISTS "materials_manage_all" ON public.materials;
CREATE POLICY "materials_select_all" ON public.materials FOR SELECT USING (true);
CREATE POLICY "materials_manage_all" ON public.materials FOR ALL USING (true) WITH CHECK (true);

-- 3. Grant table permissions to anon and authenticated
GRANT ALL ON public.courses TO anon, authenticated, service_role;
GRANT ALL ON public.academic_years TO anon, authenticated, service_role;
GRANT ALL ON public.semesters TO anon, authenticated, service_role;
GRANT ALL ON public.subjects TO anon, authenticated, service_role;
GRANT ALL ON public.units TO anon, authenticated, service_role;
GRANT ALL ON public.materials TO anon, authenticated, service_role;

-- 4. Supabase Storage: 'notes' Bucket & RLS Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('notes', 'notes', false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf']::text[];

DROP POLICY IF EXISTS "notes_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "notes_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "notes_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "notes_storage_delete" ON storage.objects;

CREATE POLICY "notes_storage_select" ON storage.objects
FOR SELECT USING (bucket_id = 'notes');

CREATE POLICY "notes_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'notes');

CREATE POLICY "notes_storage_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'notes') WITH CHECK (bucket_id = 'notes');

CREATE POLICY "notes_storage_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'notes');
