import { getSupabase } from './supabase';
import type { CheckInput, CheckResult } from './aiCheck';

/** Calls /api/check-answer. Null when the check can't run (offline, signed out, AI not set up). */
export async function checkWithAi(input: CheckInput): Promise<CheckResult | null> {
  const supa = getSupabase();
  if (!supa) return null;
  try {
    const { data } = await supa.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch('/api/check-answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as CheckResult;
  } catch {
    return null;
  }
}
