/**
 * Supabase client factory.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Vite's env. If
 * either is missing, returns `null` — callers should treat that as "not yet
 * provisioned" and fall back to local data (e.g. JSON glob in useModules).
 *
 * This lets the prototype keep running before Supabase is set up, and
 * cleanly transitions to remote data once env vars are configured in
 * `.env.local`. See README.md for setup steps.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined = undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}

/** Boolean check for callers that want to branch on availability. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}
