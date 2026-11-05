-- ==============================================================================
-- RoadRider - Live Courier Location & Real-Time Tracking Migration
-- ==============================================================================

-- 1. Ensure location and live captain tracking columns exist on public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
  ADD COLUMN IF NOT EXISTS captain_latitude double precision,
  ADD COLUMN IF NOT EXISTS captain_longitude double precision,
  ADD COLUMN IF NOT EXISTS captain_heading double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_location_update timestamptz,
  ADD COLUMN IF NOT EXISTS route_polyline text,
  ADD COLUMN IF NOT EXISTS road_distance_km numeric(6, 2),
  ADD COLUMN IF NOT EXISTS estimated_duration_mins integer;

-- 2. Ensure Realtime is enabled on public.orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- 3. Secure RPC to update captain location during an active trip
CREATE OR REPLACE FUNCTION public.update_captain_trip_location(
  p_order_id uuid,
  p_captain_latitude double precision,
  p_captain_longitude double precision,
  p_captain_heading double precision DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Validate that trip is in progress
  IF v_order.order_status IN ('cancelled', 'completed', 'delivered', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip has already ended');
  END IF;

  UPDATE public.orders
  SET
    captain_latitude = p_captain_latitude,
    captain_longitude = p_captain_longitude,
    captain_heading = COALESCE(p_captain_heading, 0),
    last_location_update = v_now,
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'captain_latitude', p_captain_latitude,
    'captain_longitude', p_captain_longitude,
    'last_location_update', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_captain_trip_location(uuid, double precision, double precision, double precision) TO authenticated, anon;
