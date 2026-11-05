import { createClient } from "@supabase/supabase-js";

// Access environment variables with fallbacks to ensure zero breakage
const envUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  "https://sjahblquggmzlihqgzyt.supabase.co";

const envKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  "sb_publishable_8u-Fko7giUJygA9_LTtVIA_2EKECUzs";

export const SUPABASE_URL = envUrl;
export const SUPABASE_ANON_KEY = envKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("your-supabase-url")
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

export const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`;

/**
 * Resolves a storage path or web URL to a fully qualified URL
 */
export function resolveStorageUrl(
  pathOrUrl?: string | null,
  bucket: "product-images" | "store-photos" | "avatars" = "product-images"
): string {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const clean = trimmed.replace(/^\/+/, "");
  if (clean.startsWith("product-images/") || clean.startsWith("store-photos/") || clean.startsWith("avatars/")) {
    return `${STORAGE_URL}/${clean}`;
  }
  return `${STORAGE_URL}/${bucket}/${clean}`;
}
