-- ==============================================================================
-- PharmaStudents.com — Safe Production Razorpay Payment System Migration
-- Migration: 20260307_razorpay_complete_integration.sql
-- ==============================================================================
-- This migration safely configures the Razorpay payment infrastructure.
-- It preserves all existing materials, orders, purchases, and student records.
-- Safe to run and rerun in Supabase Dashboard → SQL Editor.
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SECURE ADMIN HELPER FUNCTION
--    Ensures admin checks strictly require authenticated admin role
--    and never grant arbitrary admin privileges to students.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_pharma_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 2. Check admin role in profiles table
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check admins table
  IF EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid() OR email = (auth.jwt() ->> 'email')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORDERS TABLE ENHANCEMENTS (PRESERVE EXISTING SCHEMA & CONSTRAINTS)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_amount INTEGER; -- Amount in paise
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN currency VARCHAR(10) DEFAULT 'INR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN razorpay_order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill total_amount in paise for existing records if null
UPDATE public.orders
SET total_amount = COALESCE(final_amount, amount, 0) * 100
WHERE total_amount IS NULL;

-- Unique and lookup indexes for orders
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_idx
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_student_id_idx ON public.orders (student_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ORDER_ITEMS TABLE (ENSURES material_id IS TEXT)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                TEXT        NOT NULL,
  material_id             TEXT,
  material_title_snapshot TEXT        NOT NULL DEFAULT '',
  unit_price              INTEGER     NOT NULL DEFAULT 0, -- in paise
  quantity                INTEGER     NOT NULL DEFAULT 1,
  line_total              INTEGER     NOT NULL DEFAULT 0, -- in paise
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If order_items was previously created with UUID material_id, convert safely to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'material_id' 
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN material_id TYPE TEXT USING material_id::TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_material_id_idx ON public.order_items (material_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PAYMENTS TABLE (GATEWAY AUDIT & VERIFICATION LOGS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            TEXT        NOT NULL,
  student_id          UUID        NOT NULL,
  gateway             TEXT        NOT NULL DEFAULT 'razorpay',
  razorpay_order_id   TEXT        NOT NULL,
  razorpay_payment_id TEXT        UNIQUE,
  razorpay_signature  TEXT,
  amount              INTEGER     NOT NULL DEFAULT 0, -- in paise
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  status              TEXT        NOT NULL DEFAULT 'created'
                                  CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')),
  payment_method      TEXT,
  failure_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS payments_student_id_idx ON public.payments (student_id);
CREATE INDEX IF NOT EXISTS payments_razorpay_order_id_idx ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS payments_razorpay_payment_id_idx ON public.payments (razorpay_payment_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PURCHASES TABLE EXTENSIONS & COMPATIBILITY
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN order_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'free'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'purchased_at'
  ) THEN
    ALTER TABLE public.purchases ADD COLUMN purchased_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Ensure default generator on purchases.id so inserting without an ID never fails
ALTER TABLE public.purchases 
  ALTER COLUMN id SET DEFAULT ('pur_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16));

-- Ensure unique constraint on (student_id, material_id) to prevent duplicate licenses
CREATE UNIQUE INDEX IF NOT EXISTS purchases_student_material_unique_idx
  ON public.purchases (student_id, material_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PAYMENT WEBHOOK EVENTS TABLE (FOR IDEMPOTENT PROCESSING)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_event_id    TEXT        NOT NULL UNIQUE,
  event_type          TEXT        NOT NULL,
  processing_status   TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (processing_status IN ('pending', 'processed', 'failed')),
  payload             JSONB,
  error_message       TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS webhook_events_gateway_id_idx ON public.payment_webhook_events (gateway_event_id);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON public.payment_webhook_events (processing_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLEAN UP PREVIOUS FUNCTION OVERLOADS
--    Prevents PostgreSQL "function is not unique" ambiguity errors.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.confirm_order_and_grant_access(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_order_and_grant_access(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_order_and_grant_access(TEXT, TEXT, TEXT, TEXT, TEXT);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ATOMIC ORDER CONFIRMATION & ACCESS GRANT FUNCTION
--    - Callable ONLY by trusted backend (service_role).
--    - Enforces verified payment parameters before unlocking materials.
--    - Safely checks for packages table without crashing if absent.
--    - Preserves exact 'Paid' order status constraint.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_order_and_grant_access(
  p_order_id            TEXT,
  p_razorpay_order_id   TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature  TEXT DEFAULT NULL,
  p_payment_method      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_mat_id TEXT;
  v_granted_count INT := 0;
  v_sem INT := NULL;
  v_has_packages BOOLEAN := FALSE;
  v_pkg_mat_ids TEXT[];
BEGIN
  -- 1. Security Check: Restrict invocation to trusted backend (service_role or admin)
  --    Regular students cannot call this RPC directly from the browser.
  IF auth.role() = 'authenticated' AND NOT public.is_pharma_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied. Order confirmation must be performed by secure backend verification.'
    );
  END IF;

  -- 2. Validate essential payment parameters
  IF p_order_id IS NULL OR p_order_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing internal order ID.');
  END IF;

  IF p_razorpay_payment_id IS NULL OR p_razorpay_payment_id = '' THEN
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

  -- 4. Verify Razorpay Order ID matches if both are set
  IF p_razorpay_order_id IS NOT NULL 
     AND v_order.razorpay_order_id IS NOT NULL 
     AND v_order.razorpay_order_id <> '' 
     AND v_order.razorpay_order_id <> p_razorpay_order_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Order ID mismatch between gateway and database records.'
    );
  END IF;

  -- 5. Idempotency check: If already marked Paid, return immediately without duplicate work
  IF v_order.status = 'Paid' OR v_order.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'order_id', p_order_id,
      'message', 'Order was already verified and confirmed as Paid.'
    );
  END IF;

  -- 6. Reject confirmation if order was previously Cancelled or Refunded
  IF v_order.status IN ('Cancelled', 'Refunded') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot confirm order with status: ' || v_order.status
    );
  END IF;

  -- 7. Update order status to Paid (Preserving exact casing constraint: 'Paid')
  UPDATE public.orders
  SET
    status = 'Paid',
    transaction_id = p_razorpay_payment_id,
    payment_date = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 8. Upsert verified payment record into payments table
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
    COALESCE(p_razorpay_order_id, v_order.razorpay_order_id, ''),
    p_razorpay_payment_id,
    p_razorpay_signature,
    COALESCE(v_order.total_amount, (v_order.amount * 100)::INT, 0),
    COALESCE(v_order.currency, 'INR'),
    'captured',
    p_payment_method,
    NOW()
  )
  ON CONFLICT (razorpay_payment_id) DO UPDATE
  SET
    status = 'captured',
    payment_method = COALESCE(EXCLUDED.payment_method, payments.payment_method),
    updated_at = NOW();

  -- 9. Grant Material Purchases (Strictly for included materials)

  -- Source A: order_items table (Cart and verified item snapshots)
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
      status = 'unlocked',
      payment_status = 'paid',
      order_id = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
  END LOOP;

  -- Source B: orders.material_ids (If stored as JSONB array)
  IF v_order.material_ids IS NOT NULL THEN
    BEGIN
      FOR v_mat_id IN
        SELECT jsonb_array_elements_text(v_order.material_ids::jsonb)
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
            status = 'unlocked',
            payment_status = 'paid',
            order_id = EXCLUDED.order_id;

          v_granted_count := v_granted_count + 1;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Continue gracefully if material_ids is in another format
    END;
  END IF;

  -- Source C: Single material purchase (if product_type is material and product_id is specified)
  IF (v_order.product_type = 'material' OR v_order.product_type IS NULL) 
     AND v_order.product_id IS NOT NULL 
     AND v_order.product_id <> '' 
     AND v_order.product_id <> 'cart' THEN
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
      status = 'unlocked',
      payment_status = 'paid',
      order_id = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
  END IF;

  -- Source D: Semester Package Purchase (Safely checking if packages table exists)
  IF v_order.product_type IN ('package', 'semester') AND v_granted_count = 0 THEN
    -- Check if public.packages exists dynamically
    v_has_packages := (to_regclass('public.packages') IS NOT NULL);

    IF v_has_packages THEN
      BEGIN
        EXECUTE 'SELECT semester FROM public.packages WHERE id = $1'
          INTO v_sem
          USING v_order.product_id;
      EXCEPTION WHEN OTHERS THEN
        v_sem := NULL;
      END;
    END IF;

    -- If semester could not be deduced from packages table, parse from product_title
    IF v_sem IS NULL AND v_order.product_title ~ 'Semester ([1-8])' THEN
      v_sem := substring(v_order.product_title from 'Semester ([1-8])')::INT;
    END IF;

    -- Grant materials belonging strictly to that semester
    IF v_sem IS NOT NULL THEN
      FOR v_mat_id IN
        SELECT id FROM public.materials 
        WHERE semester = v_sem 
          AND (published IS TRUE OR published IS NULL)
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
          status = 'unlocked',
          payment_status = 'paid',
          order_id = EXCLUDED.order_id;

        v_granted_count := v_granted_count + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'razorpay_payment_id', p_razorpay_payment_id,
    'materials_granted', v_granted_count
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. STRICT SECURITY & PERMISSIONS
--    Confirm order function can ONLY be called by service_role (Edge Functions).
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.confirm_order_and_grant_access(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_and_grant_access(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
--     - Students CANNOT insert orders with 'Paid' status.
--     - Students CANNOT modify orders, payments, or purchases.
--     - Only service_role and verified admins can confirm payments and grant access.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- ORDERS POLICIES
DROP POLICY IF EXISTS "orders_student_select" ON public.orders;
CREATE POLICY "orders_student_select"
  ON public.orders FOR SELECT
  USING (auth.uid() = student_id OR public.is_pharma_admin());

-- Students can ONLY insert Pending orders for themselves. They CANNOT insert 'Paid' orders.
DROP POLICY IF EXISTS "orders_student_insert" ON public.orders;
CREATE POLICY "orders_student_insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    (auth.uid() = student_id AND (status = 'Pending' OR status = 'pending' OR status IS NULL))
    OR public.is_pharma_admin()
  );

-- Admins have full access to orders
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- ORDER_ITEMS POLICIES
DROP POLICY IF EXISTS "order_items_student_select" ON public.order_items;
CREATE POLICY "order_items_student_select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.student_id = auth.uid() OR public.is_pharma_admin())
    )
  );

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all"
  ON public.order_items FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- PAYMENTS POLICIES
-- Students can only read payment records for their own orders
DROP POLICY IF EXISTS "payments_student_select" ON public.payments;
CREATE POLICY "payments_student_select"
  ON public.payments FOR SELECT
  USING (auth.uid() = student_id OR public.is_pharma_admin());

DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- PURCHASES POLICIES
-- Students can only read their own purchase records
DROP POLICY IF EXISTS "purchases_student_select" ON public.purchases;
CREATE POLICY "purchases_student_select"
  ON public.purchases FOR SELECT
  USING (auth.uid() = student_id OR public.is_pharma_admin());

DROP POLICY IF EXISTS "purchases_admin_all" ON public.purchases;
CREATE POLICY "purchases_admin_all"
  ON public.purchases FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- WEBHOOK EVENTS POLICIES (Admin and Service Role Only)
DROP POLICY IF EXISTS "webhook_events_admin_only" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_admin_only"
  ON public.payment_webhook_events FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ROLE GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Service role has full permissions for Edge Functions
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.purchases TO service_role;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- Authenticated students can read their records and insert pending orders only
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.purchases TO authenticated;

-- Revoke all direct modification permissions on payments and purchases from students
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.purchases FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.orders FROM anon, authenticated;
