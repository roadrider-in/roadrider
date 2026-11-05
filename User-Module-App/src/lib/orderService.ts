/**
 * Order Service for RoadRider
 * Connects frontend checkout directly to Supabase `orders` and `order_items` tables.
 *
 * Supports:
 * - Cash on Delivery (COD): payment_method = 'COD', payment_status = 'pending', order_status = 'placed'
 * - RoadRider Wallet: payment_method = 'Wallet', payment_status = 'paid', order_status = 'placed'
 * - Online / UPI / Card abstractions
 * - Full database persistence of order records & order line items
 * - Fetching order history from Supabase
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type { Order, OrderLine } from "../state/AppState";
import type { Service } from "../data/demo";
import { computeBill, type Bill } from "./pricing";

export interface CreateOrderParams {
  service: Service;
  paymentMethod: "cod" | "wallet" | "upi" | "card";
  destination: string;
  total: number;
  promoCode?: string | null;
  lines: OrderLine[];
  storeId?: string | null;
  customerProfile?: {
    id?: string;
    name?: string;
    phone?: string;
  };
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  deliveryLandmark?: string | null;
  recipientName?: string | null;
  recipientMobile?: string | null;
  pickupAddress?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  routePolyline?: string | null;
  roadDistanceKm?: number | null;
  estimatedDurationMins?: number | null;
}

export interface CreateOrderResult {
  ok: boolean;
  order?: Order;
  dbOrderId?: string;
  error?: string;
}

const isUuid = (val: any): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Creates an order in Supabase `orders` and `order_items` tables.
 */
export async function createBackendOrder(
  params: CreateOrderParams
): Promise<CreateOrderResult> {
  const {
    service,
    paymentMethod,
    destination,
    total,
    promoCode,
    lines,
    storeId,
    customerProfile,
  } = params;

  // 1. Trusted bill calculation (never trust client-only total without calculation)
  const bill: Bill = computeBill(service, total, promoCode ?? null);

  // 2. Format payment parameters for database schema
  const dbPaymentMethod =
    paymentMethod === "cod"
      ? "COD"
      : paymentMethod === "wallet"
      ? "Wallet"
      : paymentMethod === "upi"
      ? "UPI"
      : "Card";

  const dbPaymentStatus = paymentMethod === "wallet" ? "paid" : "pending";
  const dbOrderStatus = "placed";

  let createdDbOrderId: string | null = null;
  let resolvedStoreName: string | null = null;

  // 3. If Supabase is configured, persist to database
  if (isSupabaseConfigured && supabase) {
    try {
      // Resolve a valid store_id for the service
      let resolvedStoreId: string | null = null;
      if (storeId && isUuid(storeId)) {
        resolvedStoreId = storeId;
      }

      // For rides and courier, no store_id is needed
      if (service === "rides" || service === "courier") {
        resolvedStoreId = null;
      } else if (!resolvedStoreId) {
        // Match appropriate approved store from `stores` table
        const businessType = service === "grocery" ? "grocery" : "restaurant";
        const { data: storeRows } = await supabase
          .from("stores")
          .select(`
            id,
            vendors!inner (
              onboarding_status
            )
          `)
          .eq("business_type", businessType)
          .in("vendors.onboarding_status", ["approved", "live"])
          .neq("status", "SUSPENDED")
          .eq("is_active", true)
          .limit(1);

        if (storeRows && storeRows.length > 0) {
          resolvedStoreId = storeRows[0].id;
        } else {
          // Fallback to any approved store
          const { data: anyStore } = await supabase
            .from("stores")
            .select(`
              id,
              vendors!inner (
                onboarding_status
              )
            `)
            .in("vendors.onboarding_status", ["approved", "live"])
            .neq("status", "SUSPENDED")
            .eq("is_active", true)
            .limit(1);
          if (anyStore && anyStore.length > 0) {
            resolvedStoreId = anyStore[0].id;
          }
        }
      }

      // Check if store exists, is approved, and is active & not suspended
      if (resolvedStoreId) {
        const { data: storeCheck } = await supabase
          .from("stores")
          .select(`
            id,
            status,
            is_active,
            store_name,
            vendors (
              id,
              onboarding_status
            )
          `)
          .eq("id", resolvedStoreId)
          .maybeSingle();

        if (storeCheck) {
          resolvedStoreName = storeCheck.store_name;
        }

        const vendorStatus = (storeCheck?.vendors as any)?.onboarding_status;
        const isApproved = vendorStatus === "approved" || vendorStatus === "live";

        if (storeCheck && (!isApproved || storeCheck.status === "SUSPENDED" || storeCheck.is_active === false)) {
          console.warn("[orderService] Store is unapproved, suspended or inactive:", storeCheck.store_name);
          return {
            ok: false,
            error: !isApproved
              ? `Store "${storeCheck.store_name || "selected store"}" is not an approved vendor and cannot accept customer orders.`
              : `Store "${storeCheck.store_name || "selected store"}" is currently suspended by RoadRider Operations and cannot accept orders.`,
          };
        }
      } else if (service === "food" || service === "grocery") {
        return {
          ok: false,
          error: "No approved and active stores are currently available to service this order.",
        };
      }

      // 1. Verify that user has an active, authenticated Supabase GoTrue session
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;

      if (!authUser) {
        return {
          ok: false,
          error: "Authentication required. Please sign in to place your order.",
        };
      }

      const rawPhone = customerProfile?.phone || authUser.phone || "";
      const cleanDigits = rawPhone.replace(/[^0-9]/g, "");
      const raw10 = cleanDigits.slice(-10);
      const customerPhoneFormatted = raw10.length === 10
        ? `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`
        : rawPhone || "";

      // 2. Resolve customer_id from `customers` table tied to this authenticated authUser.id
      let resolvedCustomerId: string | null = null;

      // Check if customer record exists for this auth_user_id
      const { data: custByAuth } = await supabase
        .from("customers")
        .select("id, auth_user_id, phone, full_name")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (custByAuth?.id) {
        resolvedCustomerId = custByAuth.id;
      } else {
        // If not found by auth_user_id, check if customer profile has a valid ID
        if (customerProfile?.id && isUuid(customerProfile.id)) {
          const { data: custById } = await supabase
            .from("customers")
            .select("id, auth_user_id")
            .eq("id", customerProfile.id)
            .maybeSingle();

          if (custById) {
            if (!custById.auth_user_id) {
              await supabase
                .from("customers")
                .update({ auth_user_id: authUser.id, updated_at: new Date().toISOString() })
                .eq("id", custById.id);
            }
            resolvedCustomerId = custById.id;
          }
        }

        // Match by customer phone and link auth_user_id
        if (!resolvedCustomerId && raw10.length === 10) {
          const { data: custByPhone } = await supabase
            .from("customers")
            .select("id, auth_user_id, phone")
            .ilike("phone", `%${raw10}%`)
            .maybeSingle();

          if (custByPhone?.id) {
            const { data: updatedCust } = await supabase
              .from("customers")
              .update({ auth_user_id: authUser.id, updated_at: new Date().toISOString() })
              .eq("id", custByPhone.id)
              .select("id, auth_user_id")
              .maybeSingle();

            resolvedCustomerId = updatedCust?.id || custByPhone.id;
          }
        }

        // If still no customer record, create one for this authenticated user
        if (!resolvedCustomerId) {
          const { data: newCust, error: createCustErr } = await supabase
            .from("customers")
            .insert({
              auth_user_id: authUser.id,
              phone: customerPhoneFormatted,
              full_name: customerProfile?.name || authUser.user_metadata?.full_name || "RoadRider Customer",
              status: "active",
              city: "Lucknow",
              is_active: true,
              risk_level: "low",
            })
            .select("id")
            .maybeSingle();

          if (!createCustErr && newCust) {
            resolvedCustomerId = newCust.id;
          }
        }
      }

      if (!resolvedCustomerId) {
        return {
          ok: false,
          error: "Could not link order to customer account. Please try signing in again.",
        };
      }

      const totalItemCount = lines.reduce((sum, l) => sum + (l.qty || 1), 0);

      // Validate coordinates strictly (-90 to 90, -180 to 180)
      const isValidLat =
        typeof params.deliveryLatitude === "number" &&
        !isNaN(params.deliveryLatitude) &&
        params.deliveryLatitude >= -90 &&
        params.deliveryLatitude <= 90;

      const isValidLng =
        typeof params.deliveryLongitude === "number" &&
        !isNaN(params.deliveryLongitude) &&
        params.deliveryLongitude >= -180 &&
        params.deliveryLongitude <= 180;

      const snapshotLat = isValidLat ? params.deliveryLatitude : null;
      const snapshotLng = isValidLng ? params.deliveryLongitude : null;

      // Construct complete delivery address with landmark
      let finalDeliveryAddress = destination;
      if (
        params.deliveryLandmark &&
        params.deliveryLandmark.trim().length > 0 &&
        !finalDeliveryAddress.toLowerCase().includes(params.deliveryLandmark.toLowerCase())
      ) {
        finalDeliveryAddress = `${finalDeliveryAddress} (Landmark: ${params.deliveryLandmark.trim()})`;
      }

      const recipientDisplayName =
        params.recipientName?.trim() ||
        customerProfile?.name ||
        authUser.user_metadata?.full_name ||
        "RoadRider Customer";

      const recipientContactPhone =
        params.recipientMobile?.trim() || customerPhoneFormatted;

      // Prepare immutable order snapshot payload
      const orderPayload: any = {
        store_id: resolvedStoreId,
        customer_id: resolvedCustomerId,
        customer_name: recipientDisplayName,
        customer_phone: recipientContactPhone,
        delivery_address: finalDeliveryAddress,
        delivery_latitude: snapshotLat,
        delivery_longitude: snapshotLng,
        order_status: dbOrderStatus,
        restaurant_status: "placed",
        delivery_status: "not_assigned",
        payment_status: dbPaymentStatus,
        payment_method: dbPaymentMethod,
        total_items: totalItemCount,
        subtotal: bill.itemTotal,
        packaging_fee: 0,
        delivery_fee: bill.deliveryFee,
        discount_amount: bill.discount,
        total_amount: bill.toPay,
        service_type: service,
        customer_note: paymentMethod === "cod" ? "Cash on Delivery Order" : null,
        placed_at: new Date().toISOString(),
        pickup_address: params.pickupAddress || null,
        pickup_latitude: typeof params.pickupLatitude === "number" ? params.pickupLatitude : null,
        pickup_longitude: typeof params.pickupLongitude === "number" ? params.pickupLongitude : null,
        route_polyline: params.routePolyline || null,
        road_distance_km: typeof params.roadDistanceKm === "number" ? params.roadDistanceKm : null,
        estimated_duration_mins: typeof params.estimatedDurationMins === "number" ? params.estimatedDurationMins : null,
      };

      const { data: insertedOrder, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderErr) {
        console.warn("[OrderService] Supabase order insert error:", orderErr.message);
        return {
          ok: false,
          error: `Database order creation failed: ${orderErr.message}`,
        };
      }

      createdDbOrderId = insertedOrder.id;

      // For rides service, also synchronize to `rides` table with identical ID
      if (service === "rides") {
        try {
          await supabase.from("rides").insert({
            id: createdDbOrderId,
            customer_id: resolvedCustomerId,
            pickup_address: destination.split("→")[0]?.trim() || "Pickup Location",
            drop_address: destination.split("→")[1]?.trim() || destination,
            status: "searching",
            total_fare: bill.toPay,
            payment_method: dbPaymentMethod,
            payment_status: dbPaymentStatus,
            created_at: new Date().toISOString(),
          });
        } catch (rErr) {
          console.warn("[orderService] Notice inserting into rides table:", rErr);
        }
      }

      // Insert line items into `order_items`
      if (lines.length > 0 && createdDbOrderId) {
        const itemRows = lines.map((l) => ({
          order_id: createdDbOrderId,
          product_name: l.name,
          quantity: l.qty,
          unit_price: l.price,
          total_price: l.price * l.qty,
          is_veg: true,
        }));

        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(itemRows);

        if (itemsErr) {
          console.warn("[OrderService] Error inserting order_items:", itemsErr.message);
        }
      }
    } catch (err: any) {
      console.warn("[OrderService] Unexpected database error:", err);
      return {
        ok: false,
        error: `Could not connect to database: ${err?.message || "Unknown error"}`,
      };
    }
  }

  // 4. Construct frontend Order object
  const displayId = createdDbOrderId
    ? `RR-${createdDbOrderId.slice(0, 8).toUpperCase()}`
    : `RR${Math.floor(10500 + Math.random() * 89000)}`;

  let title = "Order";
  let subtitle = `${lines.length} items`;
  if (service === "food") {
    title = resolvedStoreName || "Restaurant order";
    subtitle = `${lines.reduce((n, l) => n + l.qty, 0)} items · ${lines.map((l) => l.name).join(", ")}`;
  } else if (service === "grocery") {
    title = "Fresh grocery basket";
    subtitle = `${lines.reduce((n, l) => n + l.qty, 0)} items · Produce & Essentials`;
  } else if (service === "rides") {
    title = `Ride to ${destination.split("·")[0] || "Destination"}`;
    subtitle = `Cab service`;
  } else {
    title = `Courier Package`;
    subtitle = `Standard delivery`;
  }

  const orderResult: Order = {
    id: displayId,
    dbId: createdDbOrderId ?? undefined,
    service,
    title,
    subtitle,
    lines,
    bill,
    payment:
      paymentMethod === "cod"
        ? "Cash on Delivery (COD)"
        : paymentMethod === "wallet"
        ? "RoadRider Wallet"
        : paymentMethod === "upi"
        ? "UPI"
        : "Card",
    destination,
    status: 0, // 0 = Confirmed / Placed
    createdAt: Date.now(),
  };

  return {
    ok: true,
    order: orderResult,
    dbOrderId: createdDbOrderId ?? undefined,
  };
}

export const TERMINAL_ORDER_STATUSES = new Set([
  "cancelled",
  "rejected",
  "completed",
  "delivered",
  "expired",
  "failed",
]);

/**
 * Validates whether an order is genuinely active.
 * Terminal states (cancelled, completed, delivered, rejected, expired) return false.
 */
export function isOrderActive(order: Order | null | undefined): boolean {
  if (!order) return false;
  // 1. Numeric status check: -1 = Cancelled/Rejected, >= 4 = Completed/Delivered
  if (order.status === -1 || order.status >= 4) return false;

  // 2. String status check from Supabase backend
  if (order.orderStatus) {
    const s = order.orderStatus.toLowerCase().trim();
    if (TERMINAL_ORDER_STATUSES.has(s)) return false;
  }

  // 3. Delivery status check from Supabase backend
  if (order.deliveryStatus) {
    const ds = order.deliveryStatus.toLowerCase().trim();
    if (TERMINAL_ORDER_STATUSES.has(ds)) return false;
  }

  // 4. Restaurant status check
  if (order.restaurantStatus) {
    const rs = order.restaurantStatus.toLowerCase().trim();
    if (TERMINAL_ORDER_STATUSES.has(rs)) return false;
  }

  // 5. Expiration safeguard: orders created > 18 hours ago without active partner are expired
  if (order.createdAt && Date.now() - order.createdAt > 18 * 3600 * 1000) {
    return false;
  }

  return true;
}

export function parseBackendStatus(orderStatus: string): number {
  const s = (orderStatus || "").toLowerCase().trim();
  if (s === "cancelled" || s === "rejected" || s === "failed" || s === "expired") {
    return -1; // -1 = Cancelled / Rejected
  }
  if (s === "delivered" || s === "completed") {
    return 4; // 4 = Delivered
  }
  if (
    s === "in_transit" ||
    s === "on_the_way" ||
    s === "handed_over" ||
    s === "out_for_delivery" ||
    s === "picked_up"
  ) {
    return 3; // 3 = Handed over / Out for delivery / In transit
  }
  if (s === "ready" || s === "packed_ready") {
    return 2; // 2 = Packed & Ready for pickup
  }
  if (s === "preparing" || s === "arrived") {
    return 1; // 1 = Kitchen Preparing / Captain arrived
  }
  return 0; // 0 = Placed / Confirmed / New / Accepted / Searching
}

export type BackendOrderUpdate = {
  dbId: string;
  displayId: string;
  orderStatus: string;
  status: number;
  paymentStatus?: string;
  completedAt?: number;
  raw: any;
};

type ListenerFn = (update: BackendOrderUpdate) => void;
const backendSubscribers = new Set<ListenerFn>();
let backendChannel: any = null;

/**
 * Subscribes to realtime updates from Supabase `orders` table.
 * Uses a singleton channel to eliminate duplicate subscriptions, memory leaks, and race conditions.
 */
export function subscribeToBackendOrders(
  onUpdate: (update: BackendOrderUpdate) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  backendSubscribers.add(onUpdate);

  if (!backendChannel) {
    backendChannel = supabase
      .channel("roadrider-realtime-orders-singleton")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const raw = payload.new as any;
          if (!raw || !raw.id) return;

          const rawStatus = raw.status || raw.order_status || "";
          const status = parseBackendStatus(rawStatus);
          const displayId = `RR-${raw.id.slice(0, 8).toUpperCase()}`;

          const updatePayload: BackendOrderUpdate = {
            dbId: raw.id,
            displayId,
            orderStatus: raw.status || raw.order_status,
            status,
            paymentStatus: raw.payment_status,
            completedAt: raw.completed_at
              ? new Date(raw.completed_at).getTime()
              : undefined,
            raw,
          };

          backendSubscribers.forEach((listener) => {
            try {
              listener(updatePayload);
            } catch (err) {
              console.warn("[OrderService] Error executing listener callback:", err);
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[OrderService] Singleton realtime channel active.");
        }
      });
  }

  return () => {
    backendSubscribers.delete(onUpdate);
    if (backendSubscribers.size === 0 && backendChannel) {
      if (supabase) {
        supabase.removeChannel(backendChannel);
      }
      backendChannel = null;
    }
  };
}

/**
 * Fetches persisted orders from Supabase `orders` table.
 * Supports optional customer phone and customer ID filtering to ensure data privacy and user isolation.
 */
export async function fetchOrdersFromBackend(
  customerPhone?: string,
  customerId?: string
): Promise<Order[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  // If neither phone nor customerId is supplied, do NOT return global orders (avoids leaking data across accounts)
  if (!customerPhone && !customerId) {
    return [];
  }

  try {
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("placed_at", { ascending: false })
      .limit(50);

    const orClauses: string[] = [];

    if (customerId && isUuid(customerId)) {
      orClauses.push(`customer_id.eq.${customerId.trim()}`);
    }

    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
      const raw10 = cleanPhone.slice(-10);
      if (raw10.length === 10) {
        const p1 = raw10.slice(0, 5);
        const p2 = raw10.slice(5);
        orClauses.push(`customer_phone.ilike.%${p1}%${p2}%`);
        orClauses.push(`customer_phone.ilike.%${raw10}%`);
      }
      if (customerPhone.trim()) {
        orClauses.push(`customer_phone.eq.${customerPhone.trim()}`);
      }
    }

    if (orClauses.length > 0) {
      query = query.or(orClauses.join(","));
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn("[OrderService] Error fetching orders:", error?.message);
      return [];
    }

    return data.map((d: any) => {
      const totalAmt = Number(d.total_amount) || 0;
      const sub = Number(d.subtotal) || totalAmt;
      const delivery = Number(d.delivery_fee) || 0;
      const discount = Number(d.discount_amount) || 0;

      const orderLines: OrderLine[] = (d.order_items || []).map((it: any) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const unitPrice =
          Number(it.unit_price) ||
          (it.total_price ? Math.round(Number(it.total_price) / qty) : 0);
        return {
          name: it.product_name || "Item",
          qty,
          price: unitPrice,
        };
      });

      const fallbackQty = Math.max(1, Number(d.total_items) || 1);
      const fallbackUnitPrice = Math.round(sub / fallbackQty);

      // Calculate status number matching frontend lifecycle:
      // -1 Cancelled · 0 Confirmed · 1 Preparing · 2 Ready · 3 Handed over / On the way · 4 Delivered
      const statusNum = parseBackendStatus(d.order_status || "");

      const bill: Bill = {
        itemTotal: sub,
        deliveryFee: delivery,
        taxes: 18,
        discount,
        promo: null,
        toPay: totalAmt,
      };

      const displayId = d.id ? `RR-${d.id.slice(0, 8).toUpperCase()}` : `RR${d.order_number || "1000"}`;

      return {
        id: displayId,
        dbId: d.id,
        service: (d.service_type as Service) || "food",
        title: d.service_type === "food" ? "Food order" : d.service_type === "grocery" ? "Grocery order" : "Delivery",
        subtitle: `${d.payment_method || "COD"} · ${d.payment_status || "pending"}`,
        lines:
          orderLines.length > 0
            ? orderLines
            : [{ name: "Order items", qty: fallbackQty, price: fallbackUnitPrice }],
        bill,
        payment: d.payment_method === "COD" ? "Cash on Delivery (COD)" : d.payment_method || "Cash on Delivery",
        destination: d.delivery_address || "Lucknow, Uttar Pradesh",
        status: statusNum,
        orderStatus: d.order_status,
        restaurantStatus: d.restaurant_status || d.order_status,
        deliveryStatus: d.delivery_status || "not_assigned",
        partnerId: d.partner_id || undefined,
        prepMinutes: d.prep_minutes,
        prepDeadline: d.prep_deadline || d.promised_by,
        promisedBy: d.promised_by,
        acceptedAt: d.accepted_at,
        readyAt: d.ready_at,
        handedOverAt: d.handed_over_at,
        createdAt: d.placed_at ? new Date(d.placed_at).getTime() : Date.now(),
        completedAt: d.completed_at ? new Date(d.completed_at).getTime() : undefined,
      };
    });
  } catch (err) {
    console.warn("[OrderService] Failed to fetch backend orders:", err);
    return [];
  }
}

