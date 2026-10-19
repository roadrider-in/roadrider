import { createClient } from "@supabase/supabase-js"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Safe environment variable accessor for Expo mobile runtime, Vite browser runtime, and Node testing tools
const env =
  typeof process !== "undefined" && process.env
    ? process.env
    : typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env
      : {}

const rawUrl = (
  env.EXPO_PUBLIC_SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  ""
).trim()

const rawAnonKey = (
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim()

// Validate whether the provided values are valid, non-placeholder configuration
const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes("your-project-id") ||
  rawUrl.includes("placeholder-project")

const isPlaceholderKey =
  !rawAnonKey ||
  rawAnonKey === "your_supabase_anon_key_here" ||
  rawAnonKey === "your_supabase_anon_or_publishable_key_here" ||
  rawAnonKey.startsWith("placeholder-")

/**
 * Checks whether Supabase has been properly configured with a valid project URL and client-safe anon/publishable key.
 */
export const isSupabaseConfigured = Boolean(
  !isPlaceholderUrl && !isPlaceholderKey && rawUrl.startsWith("https://"),
)

// Provide clear, actionable setup instructions if configuration is missing or incomplete
if (!isSupabaseConfigured) {
  const missing = []
  if (!rawUrl || isPlaceholderUrl)
    missing.push("EXPO_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL")
  if (!rawAnonKey || isPlaceholderKey)
    missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY")

  console.warn(
    `[Supabase Client] Notice: Supabase configuration is missing or incomplete.\n` +
      `Missing or unconfigured variable(s): ${missing.join(", ")}\n\n` +
      `To connect live database tables and authentication:\n` +
      `  1. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env\n` +
      `  2. In your Supabase Dashboard (https://supabase.com/dashboard):\n` +
      `     - Navigate to Project Settings -> API\n` +
      `     - Copy "Project URL" and set as EXPO_PUBLIC_SUPABASE_URL\n` +
      `     - Copy "anon" (public) or "publishable" key and set as EXPO_PUBLIC_SUPABASE_ANON_KEY\n` +
      `  3. Restart your Expo development server (npx expo start).\n\n` +
      `SECURITY NOTICE: Never expose the Supabase 'service_role' key in frontend code.`,
  )
}

// Fallback placeholder credentials prevent createClient from crashing application initialization when unconfigured
const clientUrl = isSupabaseConfigured
  ? rawUrl
  : "https://placeholder-project.supabase.co"
const clientKey = isSupabaseConfigured
  ? rawAnonKey
  : "placeholder-anon-key-awaiting-configuration"

// Universal storage adapter for React Native native (iOS/Android), Web, and Node test runner
const isNodeEnvironment =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null &&
  typeof window === "undefined"

const memoryStore = new Map()
const inMemoryStorage = {
  getItem: async (key) => memoryStore.get(key) ?? null,
  setItem: async (key, value) => {
    memoryStore.set(key, String(value))
  },
  removeItem: async (key) => {
    memoryStore.delete(key)
  },
}

const resolveAuthStorage = () => {
  if (isNodeEnvironment) {
    return inMemoryStorage
  }
  const candidate =
    AsyncStorage && typeof AsyncStorage.getItem === "function"
      ? AsyncStorage
      : AsyncStorage?.default &&
          typeof AsyncStorage.default.getItem === "function"
        ? AsyncStorage.default
        : AsyncStorage?.default?.default &&
            typeof AsyncStorage.default.default.getItem === "function"
          ? AsyncStorage.default.default
          : null

  return candidate || inMemoryStorage
}

const nativeAuthStorage = resolveAuthStorage()

/**
 * Single reusable Supabase client for RoadRider Vendor Portal & Mobile App.
 * Uses client-safe publishable anon key. Never use the service-role key in frontend code.
 * Integrates AsyncStorage for secure session persistence across app launches on iOS and Android.
 */
export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    storage: nativeAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

/**
 * Centralized accessor function to obtain the Supabase client instance.
 */
export const getSupabaseClient = () => supabase

/**
 * Safe read-only health check utility to verify database connectivity.
 * @returns {Promise<{ ok: boolean; message: string; latencyMs?: number }>}
 */
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message:
        "Supabase credentials are not configured in environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
    }
  }

  const startTime = Date.now()
  try {
    const { error, status } = await supabase
      .from("cities")
      .select("id")
      .limit(1)
    const latencyMs = Date.now() - startTime

    if (error && status !== 200) {
      return {
        ok: false,
        message: `Database connection check returned status ${status}: ${error.message}`,
        latencyMs,
      }
    }

    return {
      ok: true,
      message: "Supabase connection verified successfully.",
      latencyMs,
    }
  } catch (err) {
    return {
      ok: false,
      message: `Failed to connect to Supabase: ${
        err instanceof Error ? err.message : String(err)
      }`,
    }
  }
}
