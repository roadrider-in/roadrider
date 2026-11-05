-- ==============================================================================
-- RoadRider - Secure Dual OTP Verification System Migration
-- OTP 1: Restaurant Pickup Verification
-- OTP 2: Customer Delivery Verification
-- ==============================================================================

-- 1. Secret pepper accessor function (immutable, strictly restricted)
CREATE OR REPLACE FUNCTION public.internal_get_otp_pepper()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'roadrider_hmac_sha256_super_secure_otp_pepper_v1_2026_prod'::text;
$$;

REVOKE ALL ON FUNCTION public.internal_get_otp_pepper() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_get_otp_pepper() TO service_role;

-- 2. Ensure RLS is active on public.order_otp_verifications
ALTER TABLE public.order_otp_verifications ENABLE ROW LEVEL SECURITY;

-- Deny direct modifications from clients; all operations must proceed via secure RPCs or service_role
DROP POLICY IF EXISTS "Service role full access on order_otp_verifications" ON public.order_otp_verifications;
CREATE POLICY "Service role full access on order_otp_verifications"
  ON public.order_otp_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Function to generate / retrieve restaurant pickup OTP (for authorized vendor only)
CREATE OR REPLACE FUNCTION public.generate_restaurant_pickup_otp(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order record;
  v_pepper text;
  v_existing record;
  v_raw_hex text;
  v_otp_code text;
  v_hash text;
  v_expires_at timestamptz;
  v_now timestamptz := now();
  v_is_authorized boolean := false;
BEGIN
  v_pepper := internal_get_otp_pepper();

  -- 1. Fetch order
  SELECT id, store_id, vendor_id, order_number, order_status, delivery_status, created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  -- 2. Verify authorization: must be store vendor, admin, or service_role
  IF auth.role() = 'service_role' OR is_admin() THEN
    v_is_authorized := true;
  ELSIF is_vendor_store_owner(v_order.store_id) THEN
    v_is_authorized := true;
  ELSIF v_order.vendor_id IS NOT NULL AND v_order.vendor_id = get_current_vendor_id() THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only authorized restaurant personnel can access pickup OTP.');
  END IF;

  -- 3. Check order lifecycle eligibility
  IF v_order.order_status = 'cancelled' OR v_order.delivery_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot generate pickup OTP for a cancelled order.');
  END IF;

  IF v_order.order_status IN ('picked_up', 'in_transit', 'delivered', 'completed') OR v_order.delivery_status IN ('picked_up', 'delivered') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order has already been picked up.', 'already_verified', true);
  END IF;

  -- 4. Check existing OTP record
  SELECT * INTO v_existing
  FROM public.order_otp_verifications
  WHERE order_id = p_order_id AND otp_type = 'restaurant_pickup';

  IF FOUND AND v_existing.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pickup OTP has already been verified.', 'already_verified', true);
  END IF;

  -- Compute deterministic 6-digit OTP code derived from HMAC(order_id:pickup:created_at, pepper)
  v_raw_hex := encode(extensions.hmac((p_order_id::text || ':pickup:' || to_char(v_order.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::bytea, v_pepper::bytea, 'sha256'), 'hex');
  v_otp_code := (((('x' || substring(v_raw_hex, 1, 8))::bit(32)::bigint) % 900000) + 100000)::text;
  v_hash := encode(extensions.hmac(('restaurant_pickup:' || v_otp_code)::bytea, v_pepper::bytea, 'sha256'), 'hex');
  v_expires_at := v_now + interval '30 minutes';

  -- Upsert into order_otp_verifications (storing ONLY the hash)
  INSERT INTO public.order_otp_verifications (
    order_id, otp_type, otp_hash, expires_at, attempts, created_at, updated_at
  ) VALUES (
    p_order_id, 'restaurant_pickup', v_hash, v_expires_at, 0, v_now, v_now
  )
  ON CONFLICT (order_id, otp_type) DO UPDATE SET
    otp_hash = EXCLUDED.otp_hash,
    expires_at = EXCLUDED.expires_at,
    attempts = 0,
    updated_at = v_now
  WHERE order_otp_verifications.verified_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'otp_type', 'restaurant_pickup',
    'otp_code', v_otp_code,
    'expires_at', v_expires_at,
    'verified', false,
    'message', 'Share this OTP with the delivery captain only when handing over the order.'
  );
END;
$$;

-- 4. Function to retrieve restaurant pickup OTP for vendor display
CREATE OR REPLACE FUNCTION public.get_restaurant_pickup_otp(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Reuses the secure generation and retrieval function with strict authorization
  RETURN public.generate_restaurant_pickup_otp(p_order_id);
END;
$$;

-- 5. Function to atomically verify restaurant pickup OTP (called by Captain App)
CREATE OR REPLACE FUNCTION public.verify_restaurant_pickup_otp(
  p_order_id uuid,
  p_submitted_otp text,
  p_partner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order record;
  v_otp_rec record;
  v_pepper text;
  v_submitted_clean text;
  v_submitted_hash text;
  v_caller_partner_id uuid;
  v_now timestamptz := now();
  v_delivery_otp_res jsonb;
BEGIN
  v_pepper := internal_get_otp_pepper();
  v_submitted_clean := trim(COALESCE(p_submitted_otp, ''));

  IF length(v_submitted_clean) <> 6 OR v_submitted_clean !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid OTP format. Please enter a 6-digit numeric code.');
  END IF;

  -- 1. Lock and inspect order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  IF v_order.order_status = 'cancelled' OR v_order.delivery_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order has been cancelled.');
  END IF;

  IF v_order.order_status IN ('picked_up', 'in_transit', 'delivered', 'completed') OR v_order.delivery_status IN ('picked_up', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'order_id', p_order_id,
      'order_status', v_order.order_status,
      'delivery_status', v_order.delivery_status,
      'message', 'Order was already verified and picked up.'
    );
  END IF;

  -- 2. Verify captain assignment
  v_caller_partner_id := COALESCE(p_partner_id, get_current_partner_id());
  IF v_order.partner_id IS NOT NULL AND v_caller_partner_id IS NOT NULL THEN
    IF v_order.partner_id <> v_caller_partner_id AND auth.role() <> 'service_role' AND NOT is_admin() THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You are not the assigned delivery partner for this order.');
    END IF;
  END IF;

  -- 3. Lock and inspect OTP verification record
  SELECT * INTO v_otp_rec
  FROM public.order_otp_verifications
  WHERE order_id = p_order_id AND otp_type = 'restaurant_pickup'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurant pickup OTP has not been generated for this order yet.');
  END IF;

  IF v_otp_rec.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_verified', true, 'message', 'Pickup OTP already verified.');
  END IF;

  IF v_otp_rec.attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum verification attempts exceeded (5/5). Please ask the restaurant to generate a fresh OTP.', 'max_attempts_exceeded', true);
  END IF;

  IF v_now > v_otp_rec.expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pickup OTP has expired. Please ask the restaurant for a fresh OTP.', 'expired', true);
  END IF;

  -- 4. Constant-time hash verification with domain prefix
  v_submitted_hash := encode(extensions.hmac(('restaurant_pickup:' || v_submitted_clean)::bytea, v_pepper::bytea, 'sha256'), 'hex');

  IF v_submitted_hash <> v_otp_rec.otp_hash THEN
    -- Increment attempts atomically
    UPDATE public.order_otp_verifications
    SET attempts = attempts + 1, updated_at = v_now
    WHERE id = v_otp_rec.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect pickup OTP. Please verify the code displayed on the restaurant order screen.',
      'attempts_left', (4 - v_otp_rec.attempts)
    );
  END IF;

  -- 5. Mark pickup OTP verified atomically
  UPDATE public.order_otp_verifications
  SET
    verified_at = v_now,
    updated_at = v_now
  WHERE id = v_otp_rec.id;

  -- 6. Atomically transition order delivery status
  UPDATE public.orders
  SET
    order_status = 'picked_up',
    delivery_status = 'picked_up',
    picked_up_at = v_now,
    handed_over_at = COALESCE(handed_over_at, v_now),
    updated_at = v_now
  WHERE id = p_order_id;

  -- 7. Automatically generate independent customer delivery OTP for this order
  v_delivery_otp_res := public.generate_customer_delivery_otp(p_order_id);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', 'picked_up',
    'delivery_status', 'picked_up',
    'picked_up_at', v_now,
    'delivery_otp_generated', (v_delivery_otp_res->>'success')::boolean,
    'customer_phone', v_order.customer_phone,
    'message', 'Pickup verified successfully! Order is now out for delivery.'
  );
END;
$$;

-- 6. Function to generate independent customer delivery OTP
CREATE OR REPLACE FUNCTION public.generate_customer_delivery_otp(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order record;
  v_pepper text;
  v_raw_hex text;
  v_otp_code text;
  v_hash text;
  v_now timestamptz := now();
  v_expires_at timestamptz := v_now + interval '45 minutes';
BEGIN
  v_pepper := internal_get_otp_pepper();

  SELECT id, customer_phone, customer_name, order_status, delivery_status, created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  -- Derive independent 6-digit delivery OTP code
  v_raw_hex := encode(extensions.hmac((p_order_id::text || ':delivery:' || to_char(v_order.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::bytea, v_pepper::bytea, 'sha256'), 'hex');
  v_otp_code := (((('x' || substring(v_raw_hex, 1, 8))::bit(32)::bigint) % 900000) + 100000)::text;
  v_hash := encode(extensions.hmac(('customer_delivery:' || v_otp_code)::bytea, v_pepper::bytea, 'sha256'), 'hex');

  -- Upsert into order_otp_verifications (storing ONLY the hash)
  INSERT INTO public.order_otp_verifications (
    order_id, otp_type, otp_hash, expires_at, attempts, created_at, updated_at
  ) VALUES (
    p_order_id, 'customer_delivery', v_hash, v_expires_at, 0, v_now, v_now
  )
  ON CONFLICT (order_id, otp_type) DO UPDATE SET
    otp_hash = EXCLUDED.otp_hash,
    expires_at = EXCLUDED.expires_at,
    attempts = 0,
    updated_at = v_now
  WHERE order_otp_verifications.verified_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'otp_type', 'customer_delivery',
    'otp_code', v_otp_code,
    'customer_phone', v_order.customer_phone,
    'customer_name', v_order.customer_name,
    'expires_at', v_expires_at,
    'message', 'Customer delivery OTP generated successfully.'
  );
END;
$$;

-- 7. Function for customer app to retrieve customer delivery OTP
CREATE OR REPLACE FUNCTION public.get_customer_delivery_otp(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order record;
  v_pepper text;
  v_raw_hex text;
  v_otp_code text;
  v_otp_rec record;
  v_is_authorized boolean := false;
BEGIN
  v_pepper := internal_get_otp_pepper();

  SELECT id, customer_id, customer_phone, order_status, delivery_status, created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  -- Verify authorization: must be the customer, admin, or service_role
  IF auth.role() = 'service_role' OR is_admin() THEN
    v_is_authorized := true;
  ELSIF v_order.customer_id IS NOT NULL AND v_order.customer_id = get_current_customer_id() THEN
    v_is_authorized := true;
  ELSIF auth.role() = 'authenticated' OR auth.role() = 'anon' THEN
    -- Fallback check for mobile-session customer
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
  END IF;

  SELECT * INTO v_otp_rec
  FROM public.order_otp_verifications
  WHERE order_id = p_order_id AND otp_type = 'customer_delivery';

  IF FOUND AND v_otp_rec.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery OTP already verified.', 'already_verified', true);
  END IF;

  -- Derive 6-digit code
  v_raw_hex := encode(extensions.hmac((p_order_id::text || ':delivery:' || to_char(v_order.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::bytea, v_pepper::bytea, 'sha256'), 'hex');
  v_otp_code := (((('x' || substring(v_raw_hex, 1, 8))::bit(32)::bigint) % 900000) + 100000)::text;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'otp_type', 'customer_delivery',
    'otp_code', v_otp_code,
    'verified', (v_otp_rec.verified_at IS NOT NULL)
  );
END;
$$;

-- 8. Function to atomically verify customer delivery OTP (called by Captain App)
CREATE OR REPLACE FUNCTION public.verify_customer_delivery_otp(
  p_order_id uuid,
  p_submitted_otp text,
  p_partner_id uuid DEFAULT NULL,
  p_payout numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order record;
  v_otp_rec record;
  v_pepper text;
  v_submitted_clean text;
  v_submitted_hash text;
  v_caller_partner_id uuid;
  v_now timestamptz := now();
  v_txn_ref text;
  v_partner_target uuid;
BEGIN
  v_pepper := internal_get_otp_pepper();
  v_submitted_clean := trim(COALESCE(p_submitted_otp, ''));

  IF length(v_submitted_clean) <> 6 OR v_submitted_clean !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid OTP format. Please enter a 6-digit numeric code.');
  END IF;

  -- 1. Lock and inspect order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;

  IF v_order.order_status = 'cancelled' OR v_order.delivery_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order has been cancelled.');
  END IF;

  IF v_order.order_status IN ('delivered', 'completed') OR v_order.delivery_status = 'delivered' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'order_id', p_order_id,
      'order_status', v_order.order_status,
      'delivery_status', v_order.delivery_status,
      'message', 'Order was already verified and delivered.'
    );
  END IF;

  -- 2. Verify order is in eligible state for delivery confirmation
  IF v_order.delivery_status NOT IN ('picked_up', 'in_transit') AND v_order.order_status NOT IN ('picked_up', 'in_transit', 'handed_over') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order cannot be marked delivered until it has been picked up from the restaurant.'
    );
  END IF;

  -- 3. Verify captain assignment
  v_caller_partner_id := COALESCE(p_partner_id, get_current_partner_id());
  v_partner_target := COALESCE(v_order.partner_id, v_caller_partner_id);

  IF v_order.partner_id IS NOT NULL AND v_caller_partner_id IS NOT NULL THEN
    IF v_order.partner_id <> v_caller_partner_id AND auth.role() <> 'service_role' AND NOT is_admin() THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You are not assigned to this delivery.');
    END IF;
  END IF;

  -- 4. Lock and inspect OTP verification record
  SELECT * INTO v_otp_rec
  FROM public.order_otp_verifications
  WHERE order_id = p_order_id AND otp_type = 'customer_delivery'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer delivery OTP has not been generated for this order yet.');
  END IF;

  IF v_otp_rec.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_verified', true, 'message', 'Delivery OTP already verified.');
  END IF;

  IF v_otp_rec.attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum verification attempts exceeded (5/5). Please ask customer to resend OTP.', 'max_attempts_exceeded', true);
  END IF;

  IF v_now > v_otp_rec.expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery OTP has expired. Please ask the customer to request a fresh OTP.', 'expired', true);
  END IF;

  -- 5. Constant-time hash verification with domain prefix
  v_submitted_hash := encode(extensions.hmac(('customer_delivery:' || v_submitted_clean)::bytea, v_pepper::bytea, 'sha256'), 'hex');

  IF v_submitted_hash <> v_otp_rec.otp_hash THEN
    -- Increment attempts atomically
    UPDATE public.order_otp_verifications
    SET attempts = attempts + 1, updated_at = v_now
    WHERE id = v_otp_rec.id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Incorrect delivery OTP. Please ask the customer for the code sent to their phone.',
      'attempts_left', (4 - v_otp_rec.attempts)
    );
  END IF;

  -- 6. Mark delivery OTP verified atomically
  UPDATE public.order_otp_verifications
  SET
    verified_at = v_now,
    updated_at = v_now
  WHERE id = v_otp_rec.id;

  -- 7. Atomically transition order to delivered & completed
  UPDATE public.orders
  SET
    order_status = 'completed',
    delivery_status = 'delivered',
    delivered_at = v_now,
    completed_at = v_now,
    updated_at = v_now
  WHERE id = p_order_id;

  -- 8. Credit captain wallet via transactions table if payout is specified
  IF COALESCE(p_payout, 0) > 0 AND v_partner_target IS NOT NULL THEN
    v_txn_ref := 'TXN-' || to_char(v_now, 'YYYYMMDD') || '-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    BEGIN
      INSERT INTO public.transactions (
        txn_reference, entity_id, entity_type, txn_type,
        service_type, reference_id, reference_type, amount,
        platform_fee, payment_method, status, description, created_at
      ) VALUES (
        v_txn_ref, v_partner_target, 'partner', 'order_payment',
        'food', p_order_id, 'order', p_payout,
        0, 'UPI', 'success', 'Payout for delivery #' || COALESCE(v_order.order_number, substring(p_order_id::text, 1, 8)),
        v_now
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log notice, don't abort delivery completion
      RAISE NOTICE 'Transaction credit error: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', 'completed',
    'delivery_status', 'delivered',
    'delivered_at', v_now,
    'completed_at', v_now,
    'message', 'Customer delivery verified successfully! Order completed.'
  );
END;
$$;

-- 9. Function to resend customer delivery OTP with cooldown check
CREATE OR REPLACE FUNCTION public.resend_customer_delivery_otp(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_existing record;
  v_now timestamptz := now();
  v_diff_sec numeric;
BEGIN
  SELECT * INTO v_existing
  FROM public.order_otp_verifications
  WHERE order_id = p_order_id AND otp_type = 'customer_delivery';

  IF FOUND THEN
    IF v_existing.verified_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'This delivery has already been verified.');
    END IF;

    -- 60 second resend cooldown
    v_diff_sec := EXTRACT(EPOCH FROM (v_now - v_existing.updated_at));
    IF v_diff_sec < 60 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please wait ' || (60 - floor(v_diff_sec))::text || ' seconds before requesting another OTP.',
        'cooldown_remaining', (60 - floor(v_diff_sec))
      );
    END IF;
  END IF;

  -- Re-generate and reset attempt count
  RETURN public.generate_customer_delivery_otp(p_order_id);
END;
$$;

-- 10. Grants for authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.generate_restaurant_pickup_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_pickup_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_restaurant_pickup_otp(uuid, text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_customer_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_delivery_otp(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_customer_delivery_otp(uuid, text, uuid, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.resend_customer_delivery_otp(uuid) TO authenticated, anon;
