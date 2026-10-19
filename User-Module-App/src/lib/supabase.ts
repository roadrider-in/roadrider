import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://sjahblquggmzlihqgzyt.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_8u-Fko7giUJygA9_LTtVIA_2EKECUzs";

const isPlaceholder = (val: string) =>
  !val ||
  val.includes("your-project") ||
  val.includes("your-publishable") ||
  val.includes("placeholder");

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholder(supabaseUrl) &&
    !isPlaceholder(supabaseAnonKey)
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
