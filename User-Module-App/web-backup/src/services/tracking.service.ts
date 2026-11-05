import { supabase, isSupabaseConfigured } from "./supabase";

export type OrderLifecycleState =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "rider_assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface RiderDetails {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalDeliveries: number;
  vehicleNumber?: string;
  vehicleType?: string;
  avatarUrl?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocationAt?: string | null;
}

export interface LiveOrderTracking {
  orderId: string;
  orderNumber: string;
  serviceType: "food" | "grocery" | "rides" | "courier";
  status: string;
  lifecycleState: OrderLifecycleState;
  statusCode: number; // 0 to 6
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone?: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  pickupLat?: number;
  pickupLng?: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    isVeg?: boolean;
  }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  placedAt: string;
  prepMinutes?: number;
  prepDeadline?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  etaMinutes: number;
  deliveryOtp: string;
  rider?: RiderDetails | null;
  customerNote?: string;
  cancellationReason?: string;
  isLiveTrackingAvailable: boolean;
}

/**
 * Maps raw backend database order_status and partner_id to the 7 defined lifecycle states
 */
export function mapBackendStatusToLifecycle(
  orderStatus: string,
  hasPartner: boolean
): { state: OrderLifecycleState; code: number; title: string; description: string } {
  const s = (orderStatus || "").toLowerCase().trim();

  if (s === "cancelled" || s === "rejected") {
    return {
      state: "cancelled",
      code: -1,
      title: "Order cancelled",
      description: "This order was cancelled according to applicable policy.",
    };
  }

  if (s === "delivered" || s === "completed") {
    return {
      state: "delivered",
      code: 6,
      title: "Enjoy your order!",
      description: "Delivered with care. Thank you for choosing RoadRider.",
    };
  }

  if (s === "in_transit" || s === "on_the_way") {
    return {
      state: "on_the_way",
      code: 5,
      title: "Your order is on the way!",
      description: "Your delivery partner is heading to your destination.",
    };
  }

  if (s === "picked_up" || s === "handed_over") {
    return {
      state: "picked_up",
      code: 4,
      title: "Your order has been picked up!",
      description: "The rider has collected your package from the restaurant.",
    };
  }

  if (s === "ready") {
    return {
      state: hasPartner ? "rider_assigned" : "ready",
      code: 3,
      title: hasPartner ? "Delivery partner assigned" : "Order packed and ready",
      description: hasPartner
        ? "Your delivery partner is arriving at the store for pickup."
        : "Food is freshly packed and waiting for collection.",
    };
  }

  if (s === "preparing") {
    return {
      state: "preparing",
      code: 2,
      title: "Your food is being prepared!",
      description: "The kitchen is actively preparing your meal.",
    };
  }

  if (s === "accepted") {
    return {
      state: "accepted",
      code: 1,
      title: "Restaurant accepted your order!",
      description: "The restaurant has confirmed your order and started processing.",
    };
  }

  // Default / placed / new
  return {
    state: "placed",
    code: 0,
    title: "Order placed successfully!",
    description: "Your order has been sent to the restaurant.",
  };
}

/**
 * Calculates distance in kilometers using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Fetches authoritative real-time order tracking details by Order ID
 */
export async function fetchOrderTrackingDetails(
  orderId: string
): Promise<LiveOrderTracking | null> {
  if (!isSupabaseConfigured || !supabase || !orderId) return null;

  try {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        stores (
          id,
          store_name,
          phone,
          store_addresses (
            address_line1,
            locality,
            city,
            latitude,
            longitude
          )
        )
      `)
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (orderErr || !order) {
      console.warn("[TrackingService] Order lookup error:", orderErr?.message);
      return null;
    }

    const items = (order.order_items || []).map((i: any) => ({
      name: i.product_name,
      quantity: i.quantity || 1,
      price: Number(i.unit_price) || Number(i.total_price) || 0,
      isVeg: i.is_veg !== false,
    }));

    // Partner details
    let rider: RiderDetails | null = null;
    if (order.partner_id) {
      const { data: partner } = await supabase
        .from("partners")
        .select("*")
        .eq("id", order.partner_id)
        .maybeSingle();

      if (partner) {
        rider = {
          id: partner.id,
          name: partner.full_name || partner.name || "Delivery Partner",
          phone: partner.phone || "+91 98765 43210",
          rating: Number(partner.rating) || 4.9,
          totalDeliveries: Number(partner.total_jobs_done) || 820,
          vehicleNumber: partner.vehicle_no || partner.vehicle || "UP 32 RR 4821",
          vehicleType: partner.vehicle || "Motorcycle",
          avatarUrl: partner.avatar_url || partner.profile_photo_url || null,
          currentLat: partner.current_lat ? Number(partner.current_lat) : null,
          currentLng: partner.current_lng ? Number(partner.current_lng) : null,
          lastLocationAt: partner.last_location_at,
        };
      }
    }

    const store = order.stores;
    const storeAddr = store?.store_addresses?.[0];
    const pickupLat = Number(storeAddr?.latitude) || 26.8467;
    const pickupLng = Number(storeAddr?.longitude) || 80.9462;
    const deliveryLat = Number(order.delivery_latitude) || 26.8532;
    const deliveryLng = Number(order.delivery_longitude) || 80.9984;

    const distanceKm = calculateDistanceKm(pickupLat, pickupLng, deliveryLat, deliveryLng) || 3.8;
    const etaMinutes = Math.max(12, Math.round(distanceKm * 4.5 + (order.prep_minutes || 15)));

    const lifecycle = mapBackendStatusToLifecycle(order.order_status, !!rider);

    // Deterministic 4-digit handoff OTP
    const deliveryOtp =
      order.delivery_otp && String(order.delivery_otp).length === 4
        ? String(order.delivery_otp)
        : (order.customer_phone || "").replace(/\D/g, "").slice(-4) || "4826";

    const hasLiveCoords = !!(
      rider?.currentLat &&
      rider?.currentLng &&
      Date.now() - new Date(rider.lastLocationAt || 0).getTime() < 300000
    );

    return {
      orderId: order.id,
      orderNumber: order.order_number || `RR-${order.id.slice(0, 6)}`,
      serviceType: (order.service_type || "food") as any,
      status: lifecycle.title,
      lifecycleState: lifecycle.state,
      statusCode: lifecycle.code,
      restaurantName: store?.store_name || "Royal Biryani House",
      restaurantAddress: storeAddr?.address_line1 || storeAddr?.locality || "Hazratganj, Lucknow",
      restaurantPhone: store?.phone,
      deliveryAddress: order.delivery_address || "Hazratganj, Lucknow",
      deliveryLat,
      deliveryLng,
      pickupLat,
      pickupLng,
      items,
      totalAmount: Number(order.total_amount) || 0,
      paymentMethod: order.payment_method?.toUpperCase() || "ONLINE",
      paymentStatus: order.payment_status || "paid",
      placedAt: order.placed_at || order.created_at || new Date().toISOString(),
      prepMinutes: order.prep_minutes || 20,
      prepDeadline: order.prep_deadline,
      readyAt: order.ready_at,
      pickedUpAt: order.picked_up_at || order.handed_over_at,
      deliveredAt: order.delivered_at || order.completed_at,
      etaMinutes,
      deliveryOtp,
      rider,
      customerNote: order.customer_note || undefined,
      cancellationReason: order.cancellation_reason || undefined,
      isLiveTrackingAvailable: hasLiveCoords,
    };
  } catch (err) {
    console.error("[TrackingService] fetchOrderTrackingDetails exception:", err);
    return null;
  }
}

/**
 * Subscribes to real-time status and rider location updates for an active order
 */
export function subscribeToLiveOrder(
  orderId: string,
  onUpdate: (tracking: LiveOrderTracking) => void
): () => void {
  if (!isSupabaseConfigured || !supabase || !orderId) return () => {};

  let active = true;

  // 1. Initial authoritative fetch
  fetchOrderTrackingDetails(orderId).then((data) => {
    if (active && data) onUpdate(data);
  });

  // 2. Realtime listener on `orders` table
  const orderChannel = supabase
    .channel(`order-live-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      async () => {
        if (!active) return;
        const fresh = await fetchOrderTrackingDetails(orderId);
        if (active && fresh) onUpdate(fresh);
      }
    )
    .subscribe();

  // 3. Fallback polling every 8s for live rider GPS coordinate changes
  const pollTimer = setInterval(async () => {
    if (!active) return;
    const fresh = await fetchOrderTrackingDetails(orderId);
    if (active && fresh) onUpdate(fresh);
  }, 8000);

  // 4. Handle window visibility reconnection
  const onVisibilityChange = async () => {
    if (document.visibilityState === "visible" && active) {
      const fresh = await fetchOrderTrackingDetails(orderId);
      if (active && fresh) onUpdate(fresh);
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    active = false;
    clearInterval(pollTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    supabase.removeChannel(orderChannel);
  };
}
