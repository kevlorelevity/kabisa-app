import { getSupabase } from './supabase';
import type { SuggestTarget } from '../components/adminContext';
import type { ContentOverride } from './contentOverrides';

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
  /** "What should change and why" — optional when the text is edited in place. */
  suggestion?: string;
  /** A live edit to apply on top of the bundled content (see lib/contentOverrides). */
  override?: Omit<ContentOverride, 'id'>;
  proposedText?: string;
  page: string;
  reviewerName?: string;
}

export interface SubmitResult {
  ok: boolean;
  synced: boolean;
  /** The edit is live for everyone (an override row was stored). */
  applied: boolean;
  overrideId?: string;
  error?: string;
}

export async function submitSuggestion(input: SuggestionInput): Promise<SubmitResult> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, synced: false, applied: false, error: 'not_signed_in' };
  try {
    const res = await fetch('/api/suggestion', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as {
      synced?: boolean;
      applied?: boolean;
      overrideId?: string;
      error?: string;
    };
    if (!res.ok) return { ok: false, synced: false, applied: false, error: body.error ?? `http_${res.status}` };
    return { ok: true, synced: Boolean(body.synced), applied: Boolean(body.applied), overrideId: body.overrideId };
  } catch (e) {
    return { ok: false, synced: false, applied: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}
