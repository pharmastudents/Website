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
    id TEXT PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    year INTEGER,
    semester INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 399.00,
    original_price NUMERIC(10, 2) DEFAULT 799.00,
    badge TEXT,
    material_ids JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    type TEXT NOT NULL DEFAULT 'semester',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure course_id and other columns exist on packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS material_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- 5. Seed or upsert semester packages for all existing semesters
INSERT INTO public.packages (id, course_id, semester, title, description, price, original_price, type, is_active)
SELECT 
    s.id::text,
    s.course_id,
    s.semester_number,
    COALESCE(c.name, 'B.Pharm') || ' - ' || s.title || ' Complete Study Pack' AS title,
    'Complete study notes, units and question banks for ' || COALESCE(c.name, 'B.Pharm') || ' ' || s.title AS description,
    COALESCE(s.price, c.default_semester_price, 399.00) AS price,
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

-- 7. Enable RLS and permissive policies for packages table
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "packages_select_all" ON public.packages;
DROP POLICY IF EXISTS "packages_manage_all" ON public.packages;
CREATE POLICY "packages_select_all" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages_manage_all" ON public.packages FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.packages TO anon, authenticated, service_role;

-- 8. Atomic stored procedure for synchronizing course semester prices
CREATE OR REPLACE FUNCTION public.sync_course_semester_packages(
    p_course_id UUID,
    p_price NUMERIC(10, 2)
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT := 0;
BEGIN
    -- Update course default price
    UPDATE public.courses
    SET default_semester_price = p_price
    WHERE id = p_course_id;

    -- Update semesters price
    UPDATE public.semesters
    SET price = p_price
    WHERE course_id = p_course_id;

    -- Update matching packages (packages.id = semesters.id::text)
    UPDATE public.packages p
    SET price = p_price
    FROM public.semesters s
    WHERE s.course_id = p_course_id
      AND p.id = s.id::text;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'course_id', p_course_id,
        'price', p_price,
        'updated_packages', v_updated_count
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_course_semester_packages(UUID, NUMERIC) TO anon, authenticated, service_role;
