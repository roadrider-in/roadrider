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

  // 3. If Supabase is configured, persist to database
  if (isSupabaseConfigured && supabase) {
    try {
      // Resolve a valid store_id for the service
      let resolvedStoreId: string | null = null;
      if (storeId && isUuid(storeId)) {
        resolvedStoreId = storeId;
      }

      if (!resolvedStoreId) {
        // Match appropriate store from `stores` table
        const businessType = service === "grocery" ? "grocery" : "restaurant";
        const { data: storeRows } = await supabase
          .from("stores")
          .select("id")
          .eq("business_type", businessType)
          .limit(1);

        if (storeRows && storeRows.length > 0) {
          resolvedStoreId = storeRows[0].id;
        } else {
          // Fallback to any active store
          const { data: anyStore } = await supabase
            .from("stores")
            .select("id")
            .limit(1);
          if (anyStore && anyStore.length > 0) {
            resolvedStoreId = anyStore[0].id;
          }
        }
      }

      // Resolve customer_id from `customers` table
      let resolvedCustomerId: string | null = null;
      if (customerProfile?.id && isUuid(customerProfile.id)) {
        resolvedCustomerId = customerProfile.id;
      }

      const rawPhone = customerProfile?.phone || "";
      const cleanDigits = rawPhone.replace(/[^0-9]/g, "");
      const raw10 = cleanDigits.slice(-10);

      if (!resolvedCustomerId && raw10.length === 10) {
        const p1 = raw10.slice(0, 5);
        const p2 = raw10.slice(5);
        const { data: custRows } = await supabase
          .from("customers")
          .select("id, phone")
          .or(`phone.ilike.%${p1}%${p2}%,phone.ilike.%${raw10}%,phone.eq.${rawPhone}`)
          .limit(1);

        if (custRows && custRows.length > 0) {
          resolvedCustomerId = custRows[0].id;
        }
      }

      // If still not resolved, attempt to match through active GoTrue session auth_user_id
      if (!resolvedCustomerId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const authUserId = sessionData?.session?.user?.id;
          if (authUserId && isUuid(authUserId)) {
            const { data: custByAuth } = await supabase
              .from("customers")
              .select("id")
              .eq("auth_user_id", authUserId)
              .limit(1);
            if (custByAuth && custByAuth.length > 0) {
              resolvedCustomerId = custByAuth[0].id;
            }
          }
        } catch {}
      }

      const totalItemCount = lines.reduce((sum, l) => sum + (l.qty || 1), 0);
      const customerPhoneFormatted = raw10.length === 10
        ? `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`
        : rawPhone || "+91 98765 43210";

      // Prepare order payload
      const orderPayload = {
        store_id: resolvedStoreId,
        customer_id: resolvedCustomerId,
        customer_name: customerProfile?.name || "RoadRider Customer",
        customer_phone: customerPhoneFormatted,
        delivery_address: destination,
        order_status: dbOrderStatus,
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
    title = "Royal Biryani House";
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

export function parseBackendStatus(orderStatus: string): number {
  if (orderStatus === "cancelled") {
    return -1; // -1 = Cancelled
  }
  if (orderStatus === "delivered" || orderStatus === "completed") {
    return 3;
  }
  if (orderStatus === "in_transit" || orderStatus === "on_the_way") {
    return 2;
  }
  if (orderStatus === "preparing" || orderStatus === "ready" || orderStatus === "picked_up") {
    return 1;
  }
  return 0; // "placed", "accepted", "confirmed"
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

          const status = parseBackendStatus(raw.order_status || "");
          const displayId = `RR-${raw.id.slice(0, 8).toUpperCase()}`;

          const updatePayload: BackendOrderUpdate = {
            dbId: raw.id,
            displayId,
            orderStatus: raw.order_status,
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
      const orderLines: OrderLine[] = (d.order_items || []).map((it: any) => ({
        name: it.product_name || "Item",
        qty: Number(it.quantity) || 1,
        price: Number(it.unit_price) || 0,
      }));

      // Calculate status number matching frontend lifecycle:
      // 0 Confirmed · 1 Picked up / Preparing · 2 On the way · 3 Delivered
      const statusNum = parseBackendStatus(d.order_status || "");

      const totalAmt = Number(d.total_amount) || 0;
      const sub = Number(d.subtotal) || totalAmt;
      const delivery = Number(d.delivery_fee) || 0;
      const discount = Number(d.discount_amount) || 0;

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
        lines: orderLines.length > 0 ? orderLines : [{ name: "Order items", qty: Number(d.total_items) || 1, price: sub }],
        bill,
        payment: d.payment_method === "COD" ? "Cash on Delivery (COD)" : d.payment_method || "Cash on Delivery",
        destination: d.delivery_address || "Lucknow, Uttar Pradesh",
        status: statusNum,
        createdAt: d.placed_at ? new Date(d.placed_at).getTime() : Date.now(),
        completedAt: d.completed_at ? new Date(d.completed_at).getTime() : undefined,
      };
    });
  } catch (err) {
    console.warn("[OrderService] Failed to fetch backend orders:", err);
    return [];
  }
}

