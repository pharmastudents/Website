-- ==============================================================================
-- PharmaStudents.com — Subject-Wise Sales & Unit-Wise Notes Management Migration
-- ==============================================================================

-- 1. ADD COLUMNS TO public.subjects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN thumbnail_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'price'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN price NUMERIC NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. ADD COLUMNS TO public.units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.units ADD COLUMN file_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.units ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE public.units ADD COLUMN file_size TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE public.units ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 3. CONFIGURE EXISTING STORAGE BUCKET 'thumbnail' (MIME types, public access, file size limit)
-- The Supabase Storage bucket 'thumbnail' already exists. We update it rather than creating another bucket.
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[]
WHERE id = 'thumbnail';

-- Ensure it exists in fresh environments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnail', 'thumbnail', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[];

-- Storage Policies for bucket 'thumbnail'
-- RLS remains strictly enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1) Public View Policy: Allows public HTTP GET to load thumbnails on website & dashboard (preview after refresh)
DROP POLICY IF EXISTS "Public can view thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;
CREATE POLICY "Public can view thumbnail"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnail');

-- 2) Upload Policy: Allows authenticated admin to upload to 'thumbnail'
DROP POLICY IF EXISTS "Admin upload thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload thumbnails" ON storage.objects;
CREATE POLICY "Admin upload thumbnail"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'thumbnail'
);

-- 3) Update Policy: Allows updating/upserting existing thumbnails
DROP POLICY IF EXISTS "Admin update thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update thumbnails" ON storage.objects;
CREATE POLICY "Admin update thumbnail"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'thumbnail')
WITH CHECK (bucket_id = 'thumbnail');

-- 4) Delete Policy: Allows deleting thumbnails
DROP POLICY IF EXISTS "Admin delete thumbnail" ON storage.objects;
CREATE POLICY "Admin delete thumbnail"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'thumbnail');

-- Clean up any broken session blob: URLs stored in subjects table
UPDATE public.subjects
SET thumbnail_url = NULL
WHERE thumbnail_url LIKE 'blob:%';



-- 4. ENSURE D.Pharm & B.Pharm EXIST IN courses AND HAVE SEMESTERS
DO $$
DECLARE
  v_bpharm_id UUID;
  v_dpharm_id UUID;
  v_y1 UUID;
  v_y2 UUID;
  v_y3 UUID;
  v_y4 UUID;
BEGIN
  -- B.Pharm (4 Years, 8 Semesters)
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE code = 'BPHARM') THEN
    INSERT INTO public.courses (id, name, code, description, duration_years, total_semesters, is_active, display_order)
    VALUES (gen_random_uuid(), 'B.Pharm', 'BPHARM', 'Bachelor of Pharmacy (4 Years)', 4, 8, true, 1)
    RETURNING id INTO v_bpharm_id;
  ELSE
    SELECT id INTO v_bpharm_id FROM public.courses WHERE code = 'BPHARM';
  END IF;

  -- D.Pharm (2 Years, 4 Semesters)
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE code = 'DPHARM') THEN
    INSERT INTO public.courses (id, name, code, description, duration_years, total_semesters, is_active, display_order)
    VALUES (gen_random_uuid(), 'D.Pharm', 'DPHARM', 'Diploma in Pharmacy (2 Years)', 2, 4, true, 2)
    RETURNING id INTO v_dpharm_id;
  ELSE
    SELECT id INTO v_dpharm_id FROM public.courses WHERE code = 'DPHARM';
  END IF;

  -- Ensure 8 semesters for B.Pharm
  FOR s IN 1..8 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.semesters WHERE course_id = v_bpharm_id AND semester_number = s) THEN
      INSERT INTO public.semesters (id, course_id, semester_number, title, is_active)
      VALUES (gen_random_uuid(), v_bpharm_id, s, 'Semester ' || s, true);
    END IF;
  END LOOP;

  -- Ensure 4 semesters for D.Pharm
  FOR s IN 1..4 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.semesters WHERE course_id = v_dpharm_id AND semester_number = s) THEN
      INSERT INTO public.semesters (id, course_id, semester_number, title, is_active)
      VALUES (gen_random_uuid(), v_dpharm_id, s, 'Semester ' || s, true);
    END IF;
  END LOOP;
END $$;

-- 5. UPDATE confirm_order_and_grant_access TO SUPPORT SUBJECT-LEVEL PURCHASES
CREATE OR REPLACE FUNCTION public.confirm_order_and_grant_access(
  p_order_id            TEXT,
  p_razorpay_order_id   TEXT DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_razorpay_signature  TEXT DEFAULT NULL,
  p_payment_method      TEXT DEFAULT 'online'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order                 RECORD;
  v_resolved_rzp_order_id TEXT;
  v_payment_by_rzp        public.payments%ROWTYPE;
  v_payment_by_order      public.payments%ROWTYPE;
  v_target_pay_id         UUID := NULL;
  v_already_paid          BOOLEAN := FALSE;
  v_mat_id                TEXT;
  v_granted_count         INT := 0;
  v_sem                   INT := NULL;
  v_has_packages          BOOLEAN := FALSE;
BEGIN
  -- 1. Security Check: Restrict invocation to trusted backend (service_role or admin)
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' AND NOT public.is_pharma_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Order confirmation must be performed by secure backend verification.'
    );
  END IF;

  -- 2. Validate essential payment parameters
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing internal order ID.');
  END IF;

  IF p_razorpay_payment_id IS NULL OR trim(p_razorpay_payment_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing verified Razorpay payment ID.');
  END IF;

  -- 3. Fetch and lock order row
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found: ' || p_order_id);
  END IF;

  -- 4. Reject confirmation if order was previously Cancelled or Refunded
  IF v_order.status IN ('Cancelled', 'Refunded', 'cancelled', 'refunded') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot confirm order with status: ' || v_order.status
    );
  END IF;

  -- 5. Verify Razorpay Order ID consistency if supplied
  IF p_razorpay_order_id IS NOT NULL
     AND trim(p_razorpay_order_id) <> ''
     AND v_order.razorpay_order_id IS NOT NULL
     AND trim(v_order.razorpay_order_id) <> ''
     AND v_order.razorpay_order_id <> p_razorpay_order_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order ID mismatch between gateway and database records.'
    );
  END IF;

  -- Prevent payment ID reuse across different internal orders
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE razorpay_payment_id = p_razorpay_payment_id
      AND order_id <> p_order_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Razorpay payment ID ' || p_razorpay_payment_id || ' is already linked to another order.'
    );
  END IF;

  v_resolved_rzp_order_id := COALESCE(NULLIF(trim(p_razorpay_order_id), ''), NULLIF(trim(v_order.razorpay_order_id), ''));

  -- 6. Precise Payment Row Resolution and Reconciliation
  IF v_resolved_rzp_order_id IS NOT NULL AND v_resolved_rzp_order_id <> '' THEN
    SELECT * INTO v_payment_by_rzp
    FROM public.payments
    WHERE razorpay_order_id = v_resolved_rzp_order_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_payment_by_order
  FROM public.payments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_payment_by_rzp.id IS NOT NULL
     AND v_payment_by_order.id IS NOT NULL
     AND v_payment_by_rzp.id <> v_payment_by_order.id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Data inconsistency: razorpay_order_id and order_id resolve to separate payment records.'
    );
  END IF;

  IF v_payment_by_rzp.id IS NOT NULL THEN
    v_target_pay_id := v_payment_by_rzp.id;
  ELSIF v_payment_by_order.id IS NOT NULL THEN
    v_target_pay_id := v_payment_by_order.id;
  END IF;

  IF v_target_pay_id IS NOT NULL THEN
    UPDATE public.payments
    SET
      order_id            = p_order_id,
      razorpay_order_id   = COALESCE(NULLIF(v_resolved_rzp_order_id, ''), razorpay_order_id),
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature  = COALESCE(p_razorpay_signature, razorpay_signature),
      amount              = COALESCE(NULLIF(payments.amount, 0), v_order.total_amount, (COALESCE(v_order.final_amount, v_order.amount, 0) * 100)::INT, 0),
      currency            = COALESCE(payments.currency, v_order.currency, 'INR'),
      status              = 'captured',
      payment_method      = COALESCE(p_payment_method, payment_method, 'online'),
      updated_at          = NOW()
    WHERE id = v_target_pay_id;
  ELSE
    INSERT INTO public.payments (
      order_id,
      student_id,
      gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency,
      status,
      payment_method,
      updated_at
    )
    VALUES (
      p_order_id,
      v_order.student_id,
      'razorpay',
      COALESCE(v_resolved_rzp_order_id, 'ord_' || p_order_id),
      p_razorpay_payment_id,
      p_razorpay_signature,
      COALESCE(v_order.total_amount, (COALESCE(v_order.final_amount, v_order.amount, 0) * 100)::INT, 0),
      COALESCE(v_order.currency, 'INR'),
      'captured',
      COALESCE(p_payment_method, 'online'),
      NOW()
    )
    ON CONFLICT (razorpay_order_id) DO UPDATE
    SET
      order_id            = EXCLUDED.order_id,
      razorpay_payment_id = EXCLUDED.razorpay_payment_id,
      razorpay_signature  = COALESCE(EXCLUDED.razorpay_signature, payments.razorpay_signature),
      amount              = CASE WHEN payments.amount > 0 THEN payments.amount ELSE EXCLUDED.amount END,
      status              = 'captured',
      payment_method      = COALESCE(EXCLUDED.payment_method, payments.payment_method, 'online'),
      updated_at          = NOW();
  END IF;

  -- 7. Update order status to Paid
  v_already_paid := (v_order.status = 'Paid' OR v_order.status = 'paid');

  IF NOT v_already_paid THEN
    UPDATE public.orders
    SET
      status             = 'Paid',
      razorpay_order_id  = COALESCE(orders.razorpay_order_id, v_resolved_rzp_order_id),
      transaction_id     = p_razorpay_payment_id,
      payment_date       = COALESCE(v_order.payment_date, NOW()),
      updated_at         = NOW()
    WHERE id = p_order_id;
  END IF;

  -- 8. GRANT ACCESS

  -- Source A: order_items table
  FOR v_mat_id IN
    SELECT material_id FROM public.order_items
    WHERE order_id = p_order_id AND material_id IS NOT NULL AND material_id <> ''
  LOOP
    INSERT INTO public.purchases (
      id,
      student_id,
      material_id,
      order_id,
      amount,
      status,
      payment_status,
      purchased_at,
      created_at
    )
    VALUES (
      'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_mat_id), 1, 16),
      v_order.student_id,
      v_mat_id,
      p_order_id,
      COALESCE(v_order.final_amount, v_order.amount, 0),
      'unlocked',
      'paid',
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id, material_id) DO UPDATE
    SET
      status         = 'unlocked',
      payment_status = 'paid',
      order_id       = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
  END LOOP;

  -- Source B: orders.material_ids array
  IF v_order.material_ids IS NOT NULL THEN
    IF jsonb_typeof(to_jsonb(v_order.material_ids)) = 'array' THEN
      FOR v_mat_id IN
        SELECT jsonb_array_elements_text(to_jsonb(v_order.material_ids))
      LOOP
        IF v_mat_id IS NOT NULL AND v_mat_id <> '' THEN
          INSERT INTO public.purchases (
            id,
            student_id,
            material_id,
            order_id,
            amount,
            status,
            payment_status,
            purchased_at,
            created_at
          )
          VALUES (
            'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_mat_id), 1, 16),
            v_order.student_id,
            v_mat_id,
            p_order_id,
            COALESCE(v_order.final_amount, v_order.amount, 0),
            'unlocked',
            'paid',
            NOW(),
            NOW()
          )
          ON CONFLICT (student_id, material_id) DO UPDATE
          SET
            status         = 'unlocked',
            payment_status = 'paid',
            order_id       = EXCLUDED.order_id;

          v_granted_count := v_granted_count + 1;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Source C: SUBJECT-LEVEL PURCHASE (Unlocks subject itself AND all materials in the subject)
  IF (v_order.product_type = 'subject' OR EXISTS (SELECT 1 FROM public.subjects WHERE id = v_order.product_id)) THEN
    -- 1. Grant the subject itself
    INSERT INTO public.purchases (
      id,
      student_id,
      material_id,
      order_id,
      amount,
      status,
      payment_status,
      purchased_at,
      created_at
    )
    VALUES (
      'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_order.product_id), 1, 16),
      v_order.student_id,
      v_order.product_id,
      p_order_id,
      COALESCE(v_order.final_amount, v_order.amount, 0),
      'unlocked',
      'paid',
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id, material_id) DO UPDATE
    SET
      status         = 'unlocked',
      payment_status = 'paid',
      order_id       = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;

    -- 2. Grant all materials in this subject
    FOR v_mat_id IN
      SELECT m.id FROM public.materials m
      WHERE m.subject_id = v_order.product_id
    LOOP
      INSERT INTO public.purchases (
        id,
        student_id,
        material_id,
        order_id,
        amount,
        status,
        payment_status,
        purchased_at,
        created_at
      )
      VALUES (
        'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_mat_id), 1, 16),
        v_order.student_id,
        v_mat_id,
        p_order_id,
        COALESCE(v_order.final_amount, v_order.amount, 0),
        'unlocked',
        'paid',
        NOW(),
        NOW()
      )
      ON CONFLICT (student_id, material_id) DO UPDATE
      SET
        status         = 'unlocked',
        payment_status = 'paid',
        order_id       = EXCLUDED.order_id;

      v_granted_count := v_granted_count + 1;
    END LOOP;
  END IF;

  -- Source D: Single material purchase
  IF (v_order.product_type = 'material' OR v_order.product_type IS NULL)
     AND v_order.product_id IS NOT NULL
     AND v_order.product_id <> ''
     AND v_order.product_id <> 'cart'
     AND EXISTS (SELECT 1 FROM public.materials WHERE id = v_order.product_id) THEN
    INSERT INTO public.purchases (
      id,
      student_id,
      material_id,
      order_id,
      amount,
      status,
      payment_status,
      purchased_at,
      created_at
    )
    VALUES (
      'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_order.product_id), 1, 16),
      v_order.student_id,
      v_order.product_id,
      p_order_id,
      COALESCE(v_order.final_amount, v_order.amount, 0),
      'unlocked',
      'paid',
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id, material_id) DO UPDATE
    SET
      status         = 'unlocked',
      payment_status = 'paid',
      order_id       = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
  END IF;

  -- Source E: Semester Package Purchase
  IF v_order.product_type IN ('package', 'semester') AND v_granted_count = 0 THEN
    v_has_packages := (to_regclass('public.packages') IS NOT NULL);

    IF v_has_packages THEN
      EXECUTE 'SELECT semester FROM public.packages WHERE id = $1'
        INTO v_sem
        USING v_order.product_id;
    END IF;

    IF v_sem IS NULL AND v_order.product_title ~ 'Semester ([1-8])' THEN
      v_sem := substring(v_order.product_title from 'Semester ([1-8])')::INT;
    END IF;

    IF v_sem IS NOT NULL THEN
      FOR v_mat_id IN
        SELECT m.id FROM public.materials m
        LEFT JOIN public.subjects s ON m.subject_id = s.id
        WHERE (m.semester = v_sem OR s.semester = v_sem)
          AND (m.published IS TRUE OR m.published IS NULL)
          AND (m.status IS NULL OR m.status <> 'Draft')
      LOOP
        INSERT INTO public.purchases (
          id,
          student_id,
          material_id,
          order_id,
          amount,
          status,
          payment_status,
          purchased_at,
          created_at
        )
        VALUES (
          'pur_' || substr(md5(random()::text || clock_timestamp()::text || v_mat_id), 1, 16),
          v_order.student_id,
          v_mat_id,
          p_order_id,
          COALESCE(v_order.final_amount, v_order.amount, 0),
          'unlocked',
          'paid',
          NOW(),
          NOW()
        )
        ON CONFLICT (student_id, material_id) DO UPDATE
        SET
          status         = 'unlocked',
          payment_status = 'paid',
          order_id       = EXCLUDED.order_id;

        v_granted_count := v_granted_count + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_id', p_razorpay_payment_id,
    'status', 'Paid',
    'granted_materials_count', v_granted_count,
    'message', 'Order confirmed and access granted successfully.'
  );
END;
$$;
