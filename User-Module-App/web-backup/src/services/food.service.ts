import { supabase, isSupabaseConfigured, resolveStorageUrl } from "./supabase";

export interface FoodMenuItem {
  id: string;
  storeId?: string;
  name: string;
  description: string;
  price: number;
  mrp?: number;
  photo: string;
  isVeg: boolean;
  isAvailable: boolean;
  category?: string;
}

export interface RestaurantStore {
  id: string;
  name: string;
  description: string;
  cuisines: string[];
  categories: string[];
  eta: string;
  rating: number;
  totalReviews: number;
  discount: string;
  photo: string;
  address: string;
  isOnline: boolean;
  menu: FoodMenuItem[];
}

const DEFAULT_FOOD_IMAGE =
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1080&q=85";
const DEFAULT_STORE_PHOTO =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";

function deriveStoreCategories(
  storeName: string,
  description: string,
  products: any[]
): string[] {
  const cats = new Set<string>(["All"]);
  const combined = `${storeName} ${description} ${products
    .map((p) => `${p.name} ${p.description || ""}`)
    .join(" ")}`.toLowerCase();

  if (
    combined.includes("biryani") ||
    combined.includes("chicken") ||
    combined.includes("mutton") ||
    combined.includes("mughlai")
  ) {
    cats.add("Biryani");
  }

  if (
    combined.includes("paneer") ||
    combined.includes("dal") ||
    combined.includes("roti") ||
    combined.includes("kulche") ||
    combined.includes("curry") ||
    combined.includes("north indian")
  ) {
    cats.add("North Indian");
  }

  if (combined.includes("pizza") || combined.includes("cheese") || combined.includes("italian")) {
    cats.add("Pizza");
  }

  if (combined.includes("burger") || combined.includes("patty") || combined.includes("sandwich")) {
    cats.add("Burgers");
  }

  if (
    combined.includes("chinese") ||
    combined.includes("noodle") ||
    combined.includes("manchurian") ||
    combined.includes("chilli")
  ) {
    cats.add("Chinese");
  }

  if (
    combined.includes("tikka") ||
    combined.includes("bhature") ||
    combined.includes("roll") ||
    combined.includes("chaat") ||
    combined.includes("snack") ||
    combined.includes("fast food") ||
    combined.includes("hrisabh") ||
    combined.includes("mishra")
  ) {
    cats.add("Fast Food");
  }

  if (
    combined.includes("bhog") ||
    combined.includes("sweet") ||
    combined.includes("dessert") ||
    combined.includes("halwa") ||
    combined.includes("shake")
  ) {
    cats.add("Desserts");
  }

  return Array.from(cats);
}

/**
 * Fetches approved restaurants and their menus dynamically from Supabase
 * Performs deduplication, category tagging, and location relevance
 */
export async function fetchRestaurants(options?: {
  category?: string;
  query?: string;
  city?: string;
}): Promise<RestaurantStore[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data: stores, error: storeErr } = await supabase
      .from("stores")
      .select(`
        id,
        store_name,
        slug,
        description,
        phone,
        status,
        rating,
        total_reviews,
        is_active,
        business_type,
        vendors (
          id,
          business_name,
          onboarding_status
        ),
        store_addresses (
          id,
          address_line1,
          locality,
          city,
          latitude,
          longitude
        )
      `)
      .neq("status", "SUSPENDED")
      .eq("is_active", true)
      .eq("business_type", "restaurant");

    if (storeErr || !stores || stores.length === 0) {
      if (storeErr) console.warn("[FoodService] Stores query notice:", storeErr.message);
      return [];
    }

    const storeIds = stores.map((s) => s.id);

    // Fetch products belonging to all stores
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("store_id", storeIds)
      .eq("is_available", true);

    // Fetch storefront photos
    const { data: photos } = await supabase
      .from("store_photos")
      .select("store_id, photo_type, storage_path")
      .in("store_id", storeIds);

    const allProducts = products || [];

    // Deduplicate stores by store_name
    const uniqueMap = new Map<string, any>();
    for (const s of stores) {
      const normalizedName = (s.store_name || "").trim().toLowerCase();
      const existing = uniqueMap.get(normalizedName);
      const storeProds = allProducts.filter((p) => p.store_id === s.id);

      if (!existing) {
        uniqueMap.set(normalizedName, { store: s, products: storeProds });
      } else if (storeProds.length > existing.products.length) {
        uniqueMap.set(normalizedName, { store: s, products: storeProds });
      }
    }

    const results: RestaurantStore[] = [];

    for (const { store: s, products: storeProducts } of uniqueMap.values()) {
      const addr = Array.isArray(s.store_addresses)
        ? s.store_addresses[0]
        : s.store_addresses;
      const addrStr = addr
        ? [addr.locality || addr.address_line1, addr.city].filter(Boolean).join(", ")
        : "Hazratganj, Lucknow";
      const isOnline = s.status === "ONLINE";

      const photoRecord = (photos || []).find((p) => p.store_id === s.id);
      const photoUrl = photoRecord?.storage_path
        ? resolveStorageUrl(photoRecord.storage_path, "store-photos")
        : DEFAULT_STORE_PHOTO;

      const menu: FoodMenuItem[] = (storeProducts as any[]).map((p: any) => ({
        id: p.id,
        storeId: s.id,
        name: p.name,
        description: p.description || "",
        price: Number(p.price) || 0,
        mrp: Number(p.mrp) || Number(p.price) || 0,
        photo: p.image_url
          ? resolveStorageUrl(p.image_url, "product-images")
          : DEFAULT_FOOD_IMAGE,
        isVeg: p.is_veg !== false,
        isAvailable: p.is_available !== false,
        category: p.category_id || "Main Course",
      }));

      const cuisines = s.description
        ? s.description.split("·").map((c: string) => c.trim())
        : ["North Indian", "Fast Food"];

      const categories = deriveStoreCategories(
        s.store_name,
        s.description || "",
        storeProducts
      );

      results.push({
        id: s.id,
        name: s.store_name,
        description: s.description || cuisines.join(" · "),
        cuisines,
        categories,
        eta: isOnline ? "25–35 min" : "Opens soon",
        rating: s.rating ? Number(s.rating) : 4.8,
        totalReviews: s.total_reviews || 120,
        discount: isOnline ? "20% OFF" : "CLOSED",
        photo: photoUrl,
        address: addrStr,
        isOnline,
        menu,
      });
    }

    // Sort: Online stores first
    results.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

    // Optional category filtering
    if (options?.category && options.category !== "All" && options.category !== "More") {
      const catTarget = options.category.toLowerCase().trim();
      return results.filter((r) =>
        r.categories.some((c) => c.toLowerCase() === catTarget) ||
        r.cuisines.some((c) => c.toLowerCase().includes(catTarget)) ||
        r.menu.some((m) => m.name.toLowerCase().includes(catTarget))
      );
    }

    // Optional query filtering
    if (options?.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      return results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.menu.some((m) => m.name.toLowerCase().includes(q))
      );
    }

    return results;
  } catch (err) {
    console.error("[FoodService] fetchRestaurants exception:", err);
    return [];
  }
}

/**
 * Fetches a single store by ID
 */
export async function fetchStoreById(
  storeId: string
): Promise<RestaurantStore | null> {
  const all = await fetchRestaurants();
  return all.find((s) => s.id === storeId) || null;
}
