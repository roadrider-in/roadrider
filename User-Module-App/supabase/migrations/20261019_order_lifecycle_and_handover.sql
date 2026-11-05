-- ==============================================================================
-- RoadRider - Order Lifecycle, Handover Proof & Sales Integrity Migration
-- ==============================================================================

-- 1. Ensure columns exist on public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS handed_over_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_photo_url text,
  ADD COLUMN IF NOT EXISTS handover_storage_path text,
  ADD COLUMN IF NOT EXISTS handover_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS prep_deadline timestamptz;

-- 2. Configure order-proofs storage bucket (strictly private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-proofs',
  'order-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage RLS policies for order-proofs
DROP POLICY IF EXISTS "Authenticated users can read order proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read order proofs" ON storage.objects;
CREATE POLICY "Users can read order proofs" ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'order-proofs');

DROP POLICY IF EXISTS "Authenticated users can upload order proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload order proofs" ON storage.objects;
CREATE POLICY "Users can upload order proofs" ON storage.objects
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'order-proofs');

DROP POLICY IF EXISTS "Authenticated users can update order proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update order proofs" ON storage.objects;
CREATE POLICY "Users can update order proofs" ON storage.objects
  FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'order-proofs')
  WITH CHECK (bucket_id = 'order-proofs');

-- 4. Secure RPC function: vendor_accept_order
CREATE OR REPLACE FUNCTION public.vendor_accept_order(
  p_order_id uuid,
  p_store_id uuid,
  p_prep_minutes integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
  v_deadline timestamptz;
  v_minutes integer := COALESCE(p_prep_minutes, 20);
BEGIN
  IF v_minutes < 5 THEN v_minutes := 5; END IF;
  IF v_minutes > 120 THEN v_minutes := 120; END IF;
  v_deadline := v_now + (v_minutes || ' minutes')::interval;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found for this store');
  END IF;

  IF v_order.order_status NOT IN ('new', 'placed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'order_status', v_order.order_status,
      'prep_deadline', COALESCE(v_order.prep_deadline, v_order.promised_by)
    );
  END IF;

  UPDATE public.orders
  SET
    order_status = 'preparing',
    prep_minutes = v_minutes,
    accepted_at = v_now,
    prep_deadline = v_deadline,
    promised_by = v_deadline,
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', 'preparing',
    'prep_minutes', v_minutes,
    'accepted_at', v_now,
    'prep_deadline', v_deadline
  );
END;
$$;

-- 5. Secure RPC function: vendor_ready_order
CREATE OR REPLACE FUNCTION public.vendor_ready_order(
  p_order_id uuid,
  p_store_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found for this store');
  END IF;

  IF v_order.order_status = 'ready' THEN
    RETURN jsonb_build_object('success', true, 'already_ready', true);
  END IF;

  IF v_order.order_status NOT IN ('preparing', 'new', 'placed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be marked ready from status: ' || v_order.order_status);
  END IF;

  UPDATE public.orders
  SET
    order_status = 'ready',
    ready_at = v_now,
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', 'ready',
    'ready_at', v_now
  );
END;
$$;

-- 6. Secure RPC function: vendor_handover_order
CREATE OR REPLACE FUNCTION public.vendor_handover_order(
  p_order_id uuid,
  p_store_id uuid,
  p_photo_path text,
  p_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found for this store');
  END IF;

  IF v_order.order_status IN ('handed_over', 'in_transit', 'picked_up', 'delivered', 'completed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'order_status', v_order.order_status,
      'handed_over_at', v_order.handed_over_at
    );
  END IF;

  IF p_photo_path IS NULL OR trim(p_photo_path) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Handover proof photo is strictly required');
  END IF;

  IF v_order.order_status NOT IN ('ready', 'preparing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order cannot be handed over from status: ' || v_order.order_status
    );
  END IF;

  UPDATE public.orders
  SET
    order_status = 'handed_over',
    ready_at = COALESCE(v_order.ready_at, v_now),
    handed_over_at = v_now,
    handover_storage_path = p_photo_path,
    handover_photo_url = COALESCE(p_photo_url, p_photo_path),
    handover_captured_at = v_now,
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', 'handed_over',
    'handed_over_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_accept_order(uuid, uuid, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.vendor_ready_order(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.vendor_handover_order(uuid, uuid, text, text) TO authenticated, anon;

-- 7. Update status transition trigger to permit lifecycle states
CREATE OR REPLACE FUNCTION public.protect_order_financials()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    -- Block modifications to financial, identity, and system fields
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.packaging_fee IS DISTINCT FROM OLD.packaging_fee
       OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
       OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
       OR NEW.gst_on_commission IS DISTINCT FROM OLD.gst_on_commission
       OR NEW.net_vendor_payout IS DISTINCT FROM OLD.net_vendor_payout
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.order_number IS DISTINCT FROM OLD.order_number
       OR NEW.placed_at IS DISTINCT FROM OLD.placed_at
    THEN
      RAISE EXCEPTION 'Unauthorized: Financial, calculation, identity, and payment fields cannot be modified by vendor.';
    END IF;

    -- Enforce legitimate state transitions across lifecycle
    IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
      IF OLD.order_status IN ('new', 'placed') AND NEW.order_status NOT IN ('accepted', 'preparing', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: New orders can only transition to accepted, preparing, or rejected.';
      ELSIF OLD.order_status = 'accepted' AND NEW.order_status NOT IN ('preparing', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Accepted orders can only transition to preparing or cancelled.';
      ELSIF OLD.order_status = 'preparing' AND NEW.order_status NOT IN ('ready', 'handed_over', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Preparing orders can only transition to ready or cancelled.';
      ELSIF OLD.order_status = 'ready' AND NEW.order_status NOT IN ('handed_over', 'picked_up', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Ready orders can only transition to handed_over, picked_up, or completed.';
      ELSIF OLD.order_status = 'handed_over' AND NEW.order_status NOT IN ('in_transit', 'picked_up', 'delivered', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Handed over orders can only transition to in_transit, picked_up, or delivered.';
      ELSIF OLD.order_status IN ('in_transit', 'picked_up') AND NEW.order_status NOT IN ('delivered', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: In-transit orders can only transition to delivered.';
      ELSIF OLD.order_status IN ('completed', 'cancelled', 'rejected', 'delivered') THEN
        RAISE EXCEPTION 'Invalid transition: Terminal order states cannot be altered.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

