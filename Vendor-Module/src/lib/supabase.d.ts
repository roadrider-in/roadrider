import type { SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured: boolean;
export const supabase: SupabaseClient;
export const getSupabaseClient: () => SupabaseClient;
export const checkSupabaseConnection: () => Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
}>;
