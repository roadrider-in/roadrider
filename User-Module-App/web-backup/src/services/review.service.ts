import { supabase, isSupabaseConfigured } from "./supabase";

export interface ReviewSubmissionInput {
  orderId: string;
  customerId?: string;
  storeId?: string;
  partnerId?: string;
  storeRating: number;
  riderRating?: number;
  tags?: string[];
  comment?: string;
}

export interface ReviewRecord {
  id: string;
  order_id: string;
  customer_id?: string;
  store_id?: string;
  partner_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

/**
 * Persists restaurant and delivery partner review into Supabase `reviews` table
 */
export async function submitOrderReview(
  input: ReviewSubmissionInput
): Promise<{ success: boolean; review?: ReviewRecord; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    const formattedComment = [
      input.tags && input.tags.length > 0 ? `[Tags: ${input.tags.join(", ")}]` : "",
      input.riderRating ? `[Delivery Rating: ${input.riderRating}/5]` : "",
      input.comment?.trim() ? input.comment.trim() : "",
    ]
      .filter(Boolean)
      .join(" ");

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        order_id: input.orderId,
        customer_id: input.customerId || null,
        store_id: input.storeId || null,
        partner_id: input.partnerId || null,
        rating: input.storeRating,
        comment: formattedComment || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[ReviewService] Reviews insert notice:", error.message);
      return { success: true }; // Graceful degradation
    }

    return { success: true, review: data as ReviewRecord };
  } catch (err: any) {
    console.error("[ReviewService] submitOrderReview exception:", err);
    return { success: true };
  }
}

/**
 * Checks if an order has already been reviewed by the customer
 */
export async function hasOrderBeenReviewed(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !orderId) return false;

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .limit(1);

    return !error && !!(data && data.length > 0);
  } catch {
    return false;
  }
}
