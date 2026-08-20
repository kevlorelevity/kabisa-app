/**
 * Google sign-in helpers, thin wrappers around Supabase Auth.
 *
 * Follows the same null-safe pattern as lib/supabase.ts and lib/api.ts:
 * when Supabase isn't configured (no env vars), every function is a no-op.
 * Callers should pair this with `isSupabaseConfigured()` from
 * `lib/supabase.ts` to decide whether to show auth UI at all.
 */

import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/**
 * Kicks off the Google OAuth redirect. Supabase's client SDK owns the whole
 * dance (redirect to Google, callback, token exchange, session storage) —
 * there's no custom callback route to write. `detectSessionInUrl: true` in
 * `lib/supabase.ts` is what picks the session back up on return.
 */
export async function signInWithGoogle(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;

  const { error } = await supa.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) console.error('[auth] signInWithGoogle failed:', error);
}

export async function signOut(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;

  const { error } = await supa.auth.signOut();
  if (error) console.error('[auth] signOut failed:', error);
}

export async function getSession(): Promise<Session | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const { data, error } = await supa.auth.getSession();
  if (error) {
    console.error('[auth] getSession failed:', error);
    return null;
  }
  return data.session;
}

export type { Session, User };
