import { supabase } from "../lib/supabase";

export interface CaptainLocationUpdate {
  orderId: string;
  captainLatitude: number;
  captainLongitude: number;
  captainHeading?: number;
  orderStatus: string;
  deliveryStatus: string;
  lastUpdatedTimestamp: number;
  isStale: boolean;
}

export type CaptainLocationListener = (update: CaptainLocationUpdate) => void;

/**
 * Subscribes to real-time captain location updates for a specific booking.
 */
export function subscribeToCaptainTracking(
  orderId: string,
  onUpdate: CaptainLocationListener
): () => void {
  if (!supabase || !orderId) {
    return () => {};
  }

  const channelName = `captain-tracking-${orderId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (!row) return;

        if (
          typeof row.captain_latitude === "number" &&
          typeof row.captain_longitude === "number"
        ) {
          const lastUpdated = row.last_location_update
            ? new Date(row.last_location_update).getTime()
            : Date.now();

          const isStale = Date.now() - lastUpdated > 1000 * 60 * 2; // Stale if > 2 mins

          onUpdate({
            orderId: row.id,
            captainLatitude: row.captain_latitude,
            captainLongitude: row.captain_longitude,
            captainHeading: row.captain_heading || 0,
            orderStatus: row.order_status || "placed",
            deliveryStatus: row.delivery_status || "assigned",
            lastUpdatedTimestamp: lastUpdated,
            isStale,
          });
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Dispatches a captain location update (called by captain device or during active trip).
 */
export async function sendCaptainLocationUpdate(
  orderId: string,
  latitude: number,
  longitude: number,
  heading = 0
): Promise<{ success: boolean; error?: string }> {
  if (!supabase || !orderId) {
    return { success: false, error: "Database not connected" };
  }

  try {
    const { data, error } = await supabase.rpc("update_captain_trip_location", {
      p_order_id: orderId,
      p_captain_latitude: latitude,
      p_captain_longitude: longitude,
      p_captain_heading: heading,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: Boolean(data?.success) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update location" };
  }
}
