import { getSupabase } from './supabase';
import type { SuggestTarget } from '../components/adminContext';

export type SuggestionKind = 'phrasing' | 'translation' | 'grammar' | 'layout' | 'other';

/** True when the signed-in account has role = 'admin' (granted via public.admin_email). */
export async function loadIsAdmin(userId: string | null): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) {
    // Offline dev only (no Supabase env): localStorage.ksa_admin_preview = '1' shows the pencils.
    try {
      return localStorage.getItem('ksa_admin_preview') === '1';
    } catch {
      return false;
    }
  }
  if (!userId) return false;
  const { data, error } = await supa.from('account').select('role').eq('id', userId).maybeSingle();
  if (error) return false;
  return data?.role === 'admin';
}

export interface SuggestionInput extends SuggestTarget {
  kind: SuggestionKind;
  suggestion: string;
  proposedText?: string;
  page: string;
  reviewerName?: string;
}

export async function submitSuggestion(input: SuggestionInput): Promise<{ ok: boolean; synced: boolean }> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, synced: false };
  try {
    const res = await fetch('/api/suggestion', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, synced: false };
    const body = (await res.json()) as { synced?: boolean };
    return { ok: true, synced: Boolean(body.synced) };
  } catch {
    return { ok: false, synced: false };
  }
}
