import type { SupabaseClient } from "@supabase/supabase-js"

export declare const isSupabaseConfigured: boolean
export declare const supabase: SupabaseClient
export declare const getSupabaseClient: () => SupabaseClient
export declare const checkSupabaseConnection: () => Promise<{
  ok: boolean
  message: string
  latencyMs?: number
}>
