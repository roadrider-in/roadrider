import { supabase } from "./supabase";
import {
  PACKAGE_TYPES,
  PRODUCTS,
  MORE_CUISINES,
  type PackageType,
  type Product,
} from "../data/demo";

/**
 * Service helpers for live Supabase backend data.
 *
 * Live populated tables confirmed in database:
 * - package_types (5 rows: Document, Parcel, Electronics, Food Package, Other)
 * - cuisines (15 rows: North Indian, South Indian, Chinese, Fast Food, Pizza, Biryani, etc.)
 *
 * Tables structured in database:
 * - products, stores, vendors, rides, vehicles, customer_addresses, orders, order_items, wallet_transactions
 */

/**
 * Fetches real courier package types from Supabase `package_types` table.
 */
export async function fetchPackageTypes(): Promise<PackageType[]> {
  if (!supabase) return PACKAGE_TYPES;

  try {
    const { data, error } = await supabase
      .from("package_types")
      .select("id, name, description, max_weight_kg, base_price, per_km_rate, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("[Supabase] Error loading package_types:", error.message);
      return PACKAGE_TYPES;
    }

    return data.map((d) => {
      const basePrice = Number(d.base_price) || 50;
      const perKm = Number(d.per_km_rate) || 6;
      return {
        id: String(d.id),
        abbr: d.name.slice(0, 3).toUpperCase(),
        name: d.name,
        weight: d.max_weight_kg ? `Up to ${d.max_weight_kg} kg` : d.description || "Standard",
        range: `₹${basePrice} – ₹${basePrice + perKm * 5}`,
        time: "30–45 min",
        price: basePrice,
      };
    });
  } catch (err) {
    console.warn("[Supabase] Failed to fetch package_types, falling back", err);
    return PACKAGE_TYPES;
  }
}

/**
 * Fetches real cuisine categories from Supabase `cuisines` table.
 */
export async function fetchCuisines(): Promise<string[]> {
  if (!supabase) return MORE_CUISINES;

  try {
    const { data, error } = await supabase
      .from("cuisines")
      .select("name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("[Supabase] Error loading cuisines:", error.message);
      return MORE_CUISINES;
    }

    return data.map((c) => c.name);
  } catch (err) {
    console.warn("[Supabase] Failed to fetch cuisines, falling back", err);
    return MORE_CUISINES;
  }
}

/**
 * Fetches real products from the Supabase `products` table.
 * Falls back to demo items if the database table currently has 0 rows.
 */
export async function fetchGroceryProducts(): Promise<Product[]> {
  if (!supabase) return PRODUCTS;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, mrp, unit, category_id, image_url, is_available")
      .eq("is_available", true);

    if (error || !data || data.length === 0) {
      return PRODUCTS;
    }

    return data.map((d) => ({
      id: String(d.id),
      name: d.name || "Product",
      unit: d.unit || "1 unit",
      price: Number(d.price) || 0,
      mrp: Number(d.mrp) || Number(d.price) || 0,
      category: d.category_id || "Veggies",
      photo: d.image_url || "",
    }));
  } catch (err) {
    console.warn("[Supabase] Failed to fetch products, using fallback", err);
    return PRODUCTS;
  }
}
