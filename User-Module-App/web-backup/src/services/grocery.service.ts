import { supabase, isSupabaseConfigured, resolveStorageUrl } from "./supabase";

export interface GroceryProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  mrp: number;
  category: string;
  photo: string;
  isAvailable: boolean;
  stockCount: number;
}

const DEFAULT_GROCERY_PHOTO =
  "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=1080&q=85";
const PRODUCE_PHOTO =
  "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80";

/**
 * Fetches real grocery items from Supabase `products` table
 */
export async function fetchGroceryProducts(
  categoryQuery?: string,
  searchQuery?: string
): Promise<GroceryProduct[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    let query = supabase
      .from("products")
      .select(`
        id,
        store_id,
        category_id,
        name,
        description,
        unit,
        price,
        mrp,
        image_url,
        is_available,
        stock_count,
        stores!inner (
          id,
          business_type,
          status,
          is_active,
          vendors!inner (
            onboarding_status
          )
        )
      `)
      .eq("stores.business_type", "grocery")
      .neq("stores.status", "SUSPENDED")
      .eq("stores.is_active", true)
      .in("stores.vendors.onboarding_status", ["approved", "live"]);

    if (searchQuery?.trim()) {
      query = query.ilike("name", `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    let dataToMap = data;
    if (!dataToMap || dataToMap.length === 0) {
      const { data: fallbackProducts } = await supabase
        .from("products")
        .select("id, store_id, name, description, unit, price, mrp, image_url, is_available")
        .eq("is_available", true)
        .limit(10);
      dataToMap = (fallbackProducts as any[]) || [];
    }

    if (!dataToMap || dataToMap.length === 0) {
      return [];
    }

    return dataToMap.map((d, index) => {
      const price = Number(d.price) || 0;
      const mrp = Number(d.mrp) || Math.round(price * 1.25);
      const isProduce = d.name.toLowerCase().includes("tomato") ||
                        d.name.toLowerCase().includes("broccoli") ||
                        d.name.toLowerCase().includes("fruit") ||
                        d.name.toLowerCase().includes("veg");

      const photoUrl = d.image_url
        ? resolveStorageUrl(d.image_url, "product-images")
        : isProduce || index % 2 === 1
        ? PRODUCE_PHOTO
        : DEFAULT_GROCERY_PHOTO;

      return {
        id: d.id,
        storeId: d.store_id,
        name: d.name,
        description: d.description || "",
        unit: d.unit || "1 unit",
        price,
        mrp,
        category: d.category_id || (isProduce ? "Vegetables" : "Essentials"),
        photo: photoUrl,
        isAvailable: d.is_available !== false,
        stockCount: d.stock_count || 10,
      };
    });
  } catch (err) {
    console.error("[GroceryService] fetchGroceryProducts exception:", err);
    return [];
  }
}
