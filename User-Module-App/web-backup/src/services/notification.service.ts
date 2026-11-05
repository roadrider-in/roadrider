import { supabase, isSupabaseConfigured } from "./supabase";

export interface AppNotification {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  isUnread: boolean;
  createdAt: string;
}

export const FALLBACK_NOTICES: AppNotification[] = [
  { id: "1", icon: "food", title: "Your food order is being prepared", body: "Royal Biryani House has started cooking.", time: "2 min ago", isUnread: true, createdAt: new Date().toISOString() },
  { id: "2", icon: "receipt", title: "Refund of ₹96 initiated", body: "It will reach your original payment method in 5–7 working days.", time: "1 hr ago", isUnread: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", icon: "box", title: "Courier partner reached pickup", body: "Arjun is collecting your package.", time: "Yesterday", isUnread: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

/**
 * Fetches notifications from Supabase `notifications` table
 */
export async function fetchUserNotifications(customerId?: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !supabase) return FALLBACK_NOTICES;

  try {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (customerId) {
      query = query.or(`customer_id.eq.${customerId},customer_id.is.null`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return FALLBACK_NOTICES;
    }

    return data.map((n) => {
      const icon = n.type === "order" ? "food" : n.type === "payout" ? "receipt" : "bell";
      const diffMs = Date.now() - new Date(n.created_at).getTime();
      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      const timeStr = mins < 2 ? "Just now" : mins < 60 ? `${mins} min ago` : hours < 24 ? `${hours} hr ago` : `${days} d ago`;

      return {
        id: n.id,
        icon,
        title: n.title,
        body: n.subtitle || n.body || "",
        time: timeStr,
        isUnread: n.is_unread !== false,
        createdAt: n.created_at,
      };
    });
  } catch {
    return FALLBACK_NOTICES;
  }
}

/**
 * Marks notification as read in `notifications` table
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("notifications").update({ is_unread: false }).eq("id", id);
  } catch (err) {
    console.warn("[NotificationService] mark as read error:", err);
  }
}
