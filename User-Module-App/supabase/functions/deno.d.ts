/**
 * Ambient type definitions for Supabase Deno Edge Functions
 * Resolves IDE TypeScript errors for Deno runtime globals and URL-based imports
 */

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;

  export function serve(
    handler: (req: Request) => Promise<Response> | Response,
    options?: { port?: number; onListen?: () => void }
  ): void;
}

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response,
    options?: { port?: number; onListen?: () => void }
  ): void;
}

declare module "https://deno.land/std*/http/server.ts" {
  export function serve(
    handler: (req: Request) => Promise<Response> | Response,
    options?: { port?: number; onListen?: () => void }
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js*" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): any;
  export type SupabaseClient = any;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const corsHeaders: any;
}
