-- ==============================================================================
-- PharmaStudents.com — Complete Razorpay Payment Gateway Database Migration
-- Project: tfganiacycmmnorfyqam
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORDERS TABLE ENHANCEMENTS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount INTEGER; -- Amount in paise
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill total_amount in paise for any existing records
UPDATE public.orders
SET total_amount = COALESCE(final_amount, amount, 0) * 100
WHERE total_amount IS NULL;

-- Unique index for razorpay_order_id
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_idx
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Index for student lookup
CREATE INDEX IF NOT EXISTS orders_student_id_idx ON public.orders (student_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

-- Updated_at trigger for orders
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORDER_ITEMS TABLE
--    Stores snapshots of purchased materials, unit prices, and quantities.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                TEXT        NOT NULL,
  material_id             UUID        REFERENCES public.materials(id) ON DELETE SET NULL,
  material_title_snapshot TEXT        NOT NULL DEFAULT '',
  unit_price              INTEGER     NOT NULL DEFAULT 0, -- in paise
  quantity                INTEGER     NOT NULL DEFAULT 1,
  line_total              INTEGER     NOT NULL DEFAULT 0, -- in paise
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_material_id_idx ON public.order_items (material_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAYMENTS TABLE
--    Tracks all payment attempts, gateway IDs, payment methods, and failure logs.
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

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MATERIAL PURCHASES & PURCHASES EXTENSION
--    Ensures single unique ownership per student and material.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'free'));
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT NOW();

-- Prevent duplicate purchase of the same material by the same student
CREATE UNIQUE INDEX IF NOT EXISTS purchases_student_material_unique_idx
  ON public.purchases (student_id, material_id);

-- Create compatibility view `material_purchases` matching requirement 4.D
CREATE OR REPLACE VIEW public.material_purchases AS
SELECT
  id,
  student_id,
  material_id,
  order_id,
  payment_status,
  COALESCE(purchased_at, created_at) AS purchased_at
FROM public.purchases;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PAYMENT WEBHOOK EVENTS TABLE
--    Ensures idempotent processing and records raw gateway event metadata.
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
-- 6. ATOMIC ORDER CONFIRMATION & ENTITLEMENT GRANT FUNCTION
--    Called by Edge Functions to safely mark order paid and unlock materials.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_order_and_grant_access(
  p_order_id            TEXT,
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
  v_material_id UUID;
  v_mat_ids UUID[];
  v_pur_id UUID;
  v_granted_count INT := 0;
BEGIN
  -- 1. Fetch and lock order row
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found: ' || p_order_id);
  END IF;

  -- 2. If already paid, return idempotent success
  IF v_order.status = 'paid' OR v_order.status = 'Paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'order_id', p_order_id,
      'message', 'Order was already confirmed as paid.'
    );
  END IF;

  -- 3. Update order status
  UPDATE public.orders
  SET
    status = 'paid',
    transaction_id = COALESCE(p_razorpay_payment_id, transaction_id),
    payment_date = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. Update or insert payment record
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
    COALESCE(v_order.razorpay_order_id, ''),
    p_razorpay_payment_id,
    p_razorpay_signature,
    COALESCE(v_order.total_amount, (v_order.amount * 100)::INT),
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

  -- 5. Grant material purchases for every material in order
  -- First check order_items table
  FOR v_material_id IN
    SELECT material_id FROM public.order_items WHERE order_id = p_order_id AND material_id IS NOT NULL
  LOOP
    INSERT INTO public.purchases (
      student_id,
      material_id,
      order_id,
      amount,
      status,
      payment_status,
      purchased_at
    )
    VALUES (
      v_order.student_id,
      v_material_id,
      p_order_id,
      COALESCE(v_order.final_amount, v_order.amount),
      'unlocked',
      'paid',
      NOW()
    )
    ON CONFLICT (student_id, material_id) DO UPDATE
    SET
      status = 'unlocked',
      payment_status = 'paid',
      order_id = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
  END LOOP;

  -- Also check v_order.material_ids array if present
  IF v_order.material_ids IS NOT NULL AND array_length(v_order.material_ids, 1) > 0 THEN
    FOREACH v_material_id IN ARRAY v_order.material_ids::UUID[]
    LOOP
      IF v_material_id IS NOT NULL THEN
        INSERT INTO public.purchases (
          student_id,
          material_id,
          order_id,
          amount,
          status,
          payment_status,
          purchased_at
        )
        VALUES (
          v_order.student_id,
          v_material_id,
          p_order_id,
          COALESCE(v_order.final_amount, v_order.amount),
          'unlocked',
          'paid',
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
  END IF;

  -- Also check if product_type is material and product_id is a UUID
  IF v_order.product_type = 'material' AND v_order.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_material_id := v_order.product_id::UUID;
    INSERT INTO public.purchases (
      student_id,
      material_id,
      order_id,
      amount,
      status,
      payment_status,
      purchased_at
    )
    VALUES (
      v_order.student_id,
      v_material_id,
      p_order_id,
      COALESCE(v_order.final_amount, v_order.amount),
      'unlocked',
      'paid',
      NOW()
    )
    ON CONFLICT (student_id, material_id) DO UPDATE
    SET
      status = 'unlocked',
      payment_status = 'paid',
      order_id = EXCLUDED.order_id;

    v_granted_count := v_granted_count + 1;
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
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
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

DROP POLICY IF EXISTS "orders_student_insert" ON public.orders;
CREATE POLICY "orders_student_insert"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = student_id OR public.is_pharma_admin());

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (public.is_pharma_admin())
  WITH CHECK (public.is_pharma_admin());

-- ORDER ITEMS POLICIES
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
-- 8. GRANT USAGE TO ROLES
-- ─────────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.order_items TO anon, authenticated, service_role;
GRANT ALL ON public.payments TO anon, authenticated, service_role;
GRANT ALL ON public.purchases TO anon, authenticated, service_role;
GRANT ALL ON public.payment_webhook_events TO service_role;
GRANT SELECT ON public.material_purchases TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_order_and_grant_access TO authenticated, service_role;
