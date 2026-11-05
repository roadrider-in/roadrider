import { supabase, isSupabaseConfigured } from "./supabase";

export interface UserOrder {
  id: number;
  dbId?: string;
  orderNumber: string;
  service: "food" | "rides" | "grocery" | "courier";
  title: string;
  status: string;
  statusCode: number; // 0 = placed, 1 = preparing, 2 = ready, 3 = in transit, 4 = delivered, -1 = cancelled
  price: number;
  state: "active" | "past";
  date: string;
  paidWith: string;
  deliveryAddress: string;
  itemsCount: number;
  refund?: boolean;
  createdAt: string;
}

export interface PlaceOrderInput {
  service: "food" | "rides" | "grocery" | "courier";
  storeId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  customerNote?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Maps raw backend status to human-readable string and status code
 */
export function mapOrderStatus(status: string): { label: string; code: number; state: "active" | "past" } {
  const s = (status || "").toLowerCase().trim();
  if (s === "cancelled" || s === "rejected") {
    return { label: "Cancelled", code: -1, state: "past" };
  }
  if (s === "delivered" || s === "completed") {
    return { label: "Delivered", code: 4, state: "past" };
  }
  if (s === "in_transit" || s === "on_the_way" || s === "picked_up") {
    return { label: "Arriving in 18 minutes", code: 3, state: "active" };
  }
  if (s === "ready") {
    return { label: "Packed and ready for pickup", code: 2, state: "active" };
  }
  if (s === "preparing") {
    return { label: "Preparing your order", code: 1, state: "active" };
  }
  return { label: "Order confirmed", code: 0, state: "active" };
}

/**
 * Places a real order in Supabase `orders` and `order_items` tables
 */
export async function placeOrder(
  input: PlaceOrderInput
): Promise<{ success: boolean; order?: UserOrder; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const orderNumber = `RR-${Math.floor(10000 + Math.random() * 89999)}`;
    const isCod = input.paymentMethod.toLowerCase().includes("cash") || input.paymentMethod.toLowerCase().includes("cod");
    const paymentStatus = isCod ? "pending" : "paid";
    const paymentMethodDb = isCod ? "cod" : "online";

    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        store_id: input.storeId || null,
        customer_id: input.customerId || null,
        customer_name: input.customerName || "RoadRider Customer",
        customer_phone: input.customerPhone || "+91 98765 43210",
        delivery_address: input.deliveryAddress || "Hazratganj, Lucknow",
        delivery_latitude: input.deliveryLatitude || 26.8467,
        delivery_longitude: input.deliveryLongitude || 80.9984,
        customer_note: input.customerNote || null,
        order_status: "new",
        payment_status: paymentStatus,
        payment_method: paymentMethodDb,
        total_items: Math.max(1, input.items.reduce((sum, item) => sum + item.quantity, 0)),
        subtotal: input.subtotal,
        packaging_fee: 0,
        delivery_fee: input.deliveryFee,
        discount_amount: input.discount,
        total_amount: input.totalAmount,
        commission_amount: 0,
        gst_on_commission: 0,
        net_vendor_payout: input.subtotal - input.discount,
        placed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr) {
      console.warn("[OrdersService] Order creation error:", orderErr.message);
      return { success: false, error: orderErr.message };
    }

    // Insert order line items
    if (input.items && input.items.length > 0 && orderData?.id) {
      const itemRows = input.items.map((item) => ({
        order_id: orderData.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        is_veg: true,
      }));

      await supabase.from("order_items").insert(itemRows);
    }

    const title = input.service === "food"
      ? (input.items[0]?.name ? `${input.items[0].name} & more` : "Royal Biryani House")
      : input.service === "grocery"
      ? "Fresh grocery basket"
      : input.service === "rides"
      ? `Ride to ${input.deliveryAddress.split(",")[0] || "Destination"}`
      : "Courier package";

    const createdOrder: UserOrder = {
      id: Math.floor(1000 + Math.random() * 8999),
      dbId: orderData.id,
      orderNumber,
      service: input.service,
      title,
      status: "Confirmed",
      statusCode: 0,
      price: input.totalAmount,
      state: "active",
      date: "Today",
      paidWith: input.paymentMethod,
      deliveryAddress: input.deliveryAddress,
      itemsCount: input.items.length,
      createdAt: new Date().toISOString(),
    };

    return { success: true, order: createdOrder };
  } catch (err: any) {
    console.error("[OrdersService] placeOrder exception:", err);
    return { success: false, error: err?.message || "Failed to place order." };
  }
}

/**
 * Fetches orders belonging to the customer
 */
export async function fetchCustomerOrders(
  customerId?: string,
  customerPhone?: string
): Promise<UserOrder[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("placed_at", { ascending: false })
      .limit(30);

    if (customerId) {
      query = query.eq("customer_id", customerId);
    } else if (customerPhone) {
      const digits = customerPhone.replace(/\D/g, "").slice(-10);
      if (digits) {
        query = query.ilike("customer_phone", `%${digits}%`);
      }
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) console.warn("[OrdersService] fetchCustomerOrders notice:", error.message);
      return [];
    }

    return data.map((o: any, idx: number) => {
      const st = mapOrderStatus(o.order_status);
      const isFood = o.store_id !== null;
      const serviceType = (o.service_type || (isFood ? "food" : "grocery")) as "food" | "rides" | "grocery" | "courier";
      const items = Array.isArray(o.order_items) ? o.order_items : [];

      let title = "Order";
      if (items.length > 0) {
        title = items[0].product_name + (items.length > 1 ? ` + ${items.length - 1} more` : "");
      } else if (serviceType === "food") {
        title = "Restaurant order";
      } else if (serviceType === "grocery") {
        title = "Fresh grocery basket";
      } else if (serviceType === "rides") {
        title = `Ride to ${o.delivery_address?.split(",")[0] || "Destination"}`;
      } else {
        title = "Courier package";
      }

      const orderDate = o.placed_at
        ? new Date(o.placed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "Today";

      return {
        id: idx + 1,
        dbId: o.id,
        orderNumber: o.order_number || `RR-${o.id.slice(0, 6)}`,
        service: serviceType,
        title,
        status: st.label,
        statusCode: st.code,
        price: Number(o.total_amount) || 0,
        state: st.state,
        date: orderDate,
        paidWith: o.payment_method?.toUpperCase() || "UPI",
        deliveryAddress: o.delivery_address || "",
        itemsCount: items.length || Number(o.total_items) || 1,
        refund: o.payment_status === "refunded",
        createdAt: o.placed_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("[OrdersService] fetchCustomerOrders exception:", err);
    return [];
  }
}

/**
 * Cancels an order before it is dispatched
 */
export async function cancelCustomerOrder(
  orderDbId: string,
  reason: string = "Cancelled by user",
  explanation?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase || !orderDbId) {
    return { success: false, error: "Database not configured or invalid order ID" };
  }

  try {
    const formattedReason = explanation?.trim()
      ? `${reason}: ${explanation.trim()}`
      : reason;

    const { error } = await supabase
      .from("orders")
      .update({
        order_status: "cancelled",
        cancellation_reason: formattedReason,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", orderDbId);

    if (error) {
      console.warn("[OrdersService] Cancel order error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to cancel order" };
  }
}

/**
 * Subscribes to realtime order updates
 */
export function subscribeToOrders(
  onUpdate: (order: any) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel("customer-orders-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
