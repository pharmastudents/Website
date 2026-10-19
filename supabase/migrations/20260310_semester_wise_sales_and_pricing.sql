-- ============================================================================
-- PharmaStudents — Semester-Wise Sales & Pricing Migration
-- Safe & Idempotent Migration
-- ============================================================================

-- 1. Add semester package pricing columns to `semesters` table if not already present
ALTER TABLE public.semesters 
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 399.00;

ALTER TABLE public.semesters 
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) DEFAULT 799.00;

-- 2. Add default_semester_price to `courses` table if not already present
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS default_semester_price NUMERIC(10, 2) DEFAULT 399.00;

-- 3. Set existing NULL prices to default ₹399
UPDATE public.semesters
SET price = 399.00
WHERE price IS NULL;

UPDATE public.semesters
SET original_price = 799.00
WHERE original_price IS NULL;

UPDATE public.courses
SET default_semester_price = 399.00
WHERE default_semester_price IS NULL;

-- 4. Ensure `packages` table exists and contains semester packages
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    semester INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 399.00,
    original_price NUMERIC(10, 2) DEFAULT 799.00,
    type TEXT NOT NULL DEFAULT 'semester',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Seed or upsert semester packages for all existing semesters
INSERT INTO public.packages (id, course_id, semester, title, description, price, original_price, type, is_active)
SELECT 
    s.id,
    s.course_id,
    s.semester_number,
    COALESCE(c.name, 'B.Pharm') || ' - ' || s.title AS title,
    'Complete study notes, units and question banks for ' || COALESCE(c.name, 'B.Pharm') || ' ' || s.title AS description,
    COALESCE(s.price, 399.00) AS price,
    COALESCE(s.original_price, 799.00) AS original_price,
    'semester' AS type,
    true AS is_active
FROM public.semesters s
LEFT JOIN public.courses c ON c.id = s.course_id
ON CONFLICT (id) DO UPDATE 
SET 
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    title = EXCLUDED.title;

-- 6. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_semesters_course_num ON public.semesters(course_id, semester_number);
CREATE INDEX IF NOT EXISTS idx_packages_type_sem ON public.packages(type, semester);
