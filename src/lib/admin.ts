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

// ---------- AI edits, background jobs & team guidance ----------

export type AiScope = 'item' | 'dialogue' | 'practice';

export interface AiEditInput {
  lessonId: string;
  scope: AiScope;
  kind?: 'turn' | 'practice';
  itemId?: string;
  targetLabel?: string;
  instruction: string;
  /** Lesson context for the AI (title, level, notes, vocabulary). */
  lesson: Record<string, unknown>;
  /** The current raw content being revised. */
  current: unknown;
}

export async function submitAiEdit(input: AiEditInput): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, error: 'not_signed_in' };
  try {
    const res = await fetch('/api/ai-edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, lesson: { id: input.lessonId, ...input.lesson } }),
    });
    const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `http_${res.status}` };
    return { ok: true, jobId: body.jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

export interface AiJob {
  id: string;
  created_at: string;
  lesson_id: string;
  scope: AiScope;
  item_id: string | null;
  target_label: string | null;
  instruction: string;
  status: 'working' | 'live' | 'failed' | 'undone';
  summary: string | null;
  error: string | null;
  patch_id: string | null;
}

export async function listAiJobs(limit = 25): Promise<AiJob[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from('ai_job')
    .select('id,created_at,lesson_id,scope,item_id,target_label,instruction,status,summary,error,patch_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AiJob[];
}

export async function undoAiJob(job: AiJob): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  if (job.patch_id) {
    const { error } = await supa.from('content_patch').update({ active: false }).eq('id', job.patch_id);
    if (error) return false;
  }
  const { error } = await supa.from('ai_job').update({ status: 'undone', updated_at: new Date().toISOString() }).eq('id', job.id);
  return !error;
}

export interface GuidanceNote {
  id: string;
  created_at: string;
  text: string;
  lesson_id: string | null;
  target_label: string | null;
}

export async function saveGuidance(note: { text: string; lessonId?: string; itemId?: string; targetLabel?: string }): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { error } = await supa.from('admin_guidance').insert({
    text: note.text,
    lesson_id: note.lessonId ?? null,
    item_id: note.itemId ?? null,
    target_label: note.targetLabel ?? null,
  });
  return !error;
}

export async function listGuidance(): Promise<GuidanceNote[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from('admin_guidance')
    .select('id,created_at,text,lesson_id,target_label')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as GuidanceNote[];
}

export async function retireGuidance(id: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { error } = await supa.from('admin_guidance').update({ active: false }).eq('id', id);
  return !error;
}
