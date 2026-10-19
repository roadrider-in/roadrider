import { createClient } from '@supabase/supabase-js';

// Safe environment variable accessor for both Vite browser runtime and Node testing tools
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

const rawUrl = env.VITE_SUPABASE_URL?.trim() || '';
const rawAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Validate whether the provided values are valid, non-placeholder configuration
const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('your-project-id') ||
  rawUrl.includes('placeholder-project');

const isPlaceholderKey =
  !rawAnonKey ||
  rawAnonKey === 'your_supabase_anon_key_here' ||
  rawAnonKey === 'your_supabase_anon_or_publishable_key_here' ||
  rawAnonKey.startsWith('placeholder-');

/**
 * Checks whether Supabase has been properly configured with a valid project URL and client-safe anon/publishable key.
 */
export const isSupabaseConfigured = Boolean(!isPlaceholderUrl && !isPlaceholderKey && rawUrl.startsWith('https://'));

// Provide clear, actionable setup instructions if configuration is missing or incomplete
if (!isSupabaseConfigured) {
  const missing = [];
  if (!rawUrl || isPlaceholderUrl) missing.push('VITE_SUPABASE_URL');
  if (!rawAnonKey || isPlaceholderKey) missing.push('VITE_SUPABASE_ANON_KEY');

  console.warn(
    `[Supabase Client] Notice: Supabase configuration is missing or incomplete.\n` +
      `Missing or unconfigured variable(s): ${missing.join(', ')}\n\n` +
      `To connect live database tables and authentication:\n` +
      `  1. Copy .env.example to .env (or .env.local)\n` +
      `  2. In your Supabase Dashboard (https://supabase.com/dashboard):\n` +
      `     - Navigate to Project Settings -> API\n` +
      `     - Copy "Project URL" and set as VITE_SUPABASE_URL\n` +
      `     - Copy "anon" (public) or "publishable" key and set as VITE_SUPABASE_ANON_KEY\n` +
      `  3. Restart your development server (npm run dev).\n\n` +
      `SECURITY NOTICE: Never expose the Supabase 'service_role' key in frontend code.`
  );
}

// Fallback placeholder credentials prevent createClient from crashing application initialization when unconfigured
const clientUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-project.supabase.co';
const clientKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-anon-key-awaiting-configuration';

/**
 * Single reusable Supabase client for RoadRider Vendor Portal.
 * Uses client-safe publishable anon key. Never use the service-role key in frontend code.
 */
export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Centralized accessor function to obtain the Supabase client instance.
 */
export const getSupabaseClient = () => supabase;

/**
 * Safe read-only health check utility to verify database connectivity.
 * @returns {Promise<{ ok: boolean; message: string; latencyMs?: number }>}
 */
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase credentials are not configured in environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    };
  }

  const startTime = Date.now();
  try {
    const { error, status } = await supabase.from('cities').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error && status !== 200) {
      return {
        ok: false,
        message: `Database connection check returned status ${status}: ${error.message}`,
        latencyMs,
      };
    }

    return {
      ok: true,
      message: 'Supabase connection verified successfully.',
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Failed to connect to Supabase: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};

