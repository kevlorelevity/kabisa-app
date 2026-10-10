import { getSupabase } from './supabase';
import type { SuggestTarget } from '../components/adminContext';
import type { AiLessonRow, ContentOverride, ContentPatch, Span } from './contentOverrides';
import type { NewLessonInput } from './aiLesson';
import type { FollowupInput, FollowupQuestion } from './aiFollowup';

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

export type AiScope = 'item' | 'dialogue' | 'practice' | 'followup' | 'lesson' | 'sync';

export interface AiEditInput {
  lessonId: string;
  scope: AiScope;
  kind?: 'turn' | 'practice' | 'word' | 'vocab';
  itemId?: string;
  /** Word edits: which glossed word of the turn, and whether its note/Sanifu apply everywhere. */
  wordIndex?: number;
  everywhere?: boolean;
  /** Automatic tooltip refresh after an admin edited the line's Swahili (line + choices stay as edited). */
  regloss?: boolean;
  /** With regloss: the admin set the English in the same edit — the AI must keep it. */
  keepEnglish?: boolean;
  /** Apply the AI's word swaps to every lesson. */
  propagate?: boolean;
  targetLabel?: string;
  instruction: string;
  /** Lesson context for the AI (title, level, notes, vocabulary). */
  lesson: Record<string, unknown>;
  /** The current raw content being revised. */
  current: unknown;
  /** Whole-conversation rewrites: the lesson's key vocabulary and practice, reviewed afterwards to match. */
  companion?: { vocabulary: unknown[]; practice: unknown[] };
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
  status: 'working' | 'live' | 'failed' | 'undone' | 'review';
  summary: string | null;
  error: string | null;
  patch_id: string | null;
  created_by: string | null;
  /** status 'review': places the AI wants an admin's call on. */
  questions: FollowupQuestion[] | null;
  /** Word swaps from an ✨ AI edit, still to be checked across the app. */
  pending_swaps: Span[] | null;
}

export async function listAiJobs(limit = 25): Promise<AiJob[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from('ai_job')
    .select('id,created_at,lesson_id,scope,item_id,target_label,instruction,status,summary,error,patch_id,created_by,questions,pending_swaps')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AiJob[];
}

export async function undoAiJob(job: AiJob): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  // Every patch the job wrote (an AI edit's item, a follow-up's places and learner note).
  const { error: e1 } = await supa.from('content_patch').update({ active: false }).eq('job_id', job.id);
  if (e1) return false;
  if (job.scope === 'lesson') await supa.from('ai_lesson').update({ active: false }).eq('job_id', job.id);
  if (job.patch_id) await supa.from('content_patch').update({ active: false }).eq('id', job.patch_id);
  const { error } = await supa.from('ai_job').update({ status: 'undone', updated_at: new Date().toISOString() }).eq('id', job.id);
  return !error;
}

export interface GuidanceNote {
  id: string;
  created_at: string;
  text: string;
  kind: string;
  lesson_id: string | null;
  target_label: string | null;
}

export async function saveGuidance(note: {
  text: string;
  kind?: 'context' | 'note' | 'sanifu' | 'rule';
  lessonId?: string;
  itemId?: string;
  targetLabel?: string;
}): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { error } = await supa.from('admin_guidance').insert({
    text: note.text.slice(0, 4000),
    kind: note.kind ?? 'rule',
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
    .select('id,created_at,text,kind,lesson_id,target_label')
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

/** Stores a hand-written note / Sanifu (a 'fields' or 'word' content_patch). Live for everyone on their next load. */
export async function saveNotePatch(p: Pick<ContentPatch, 'lesson_id' | 'scope' | 'item_id' | 'value'>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supa = getSupabase();
  if (!supa) return { ok: false, error: 'offline' };
  const { data, error } = await supa.from('content_patch').insert(p).select('id').single();
  return error ? { ok: false, error: error.message } : { ok: true, id: (data as { id: string }).id };
}

/** Starts the context-aware follow-up of an edit (other places + learner note). Runs in the background. */
export async function submitFollowup(input: FollowupInput): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, error: 'not_signed_in' };
  try {
    const res = await fetch('/api/ai-followup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `http_${res.status}` };
    return { ok: true, jobId: body.jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

/** All patches a job wrote (to show them without a reload). */
export async function loadJobPatches(jobIds: string[]): Promise<ContentPatch[]> {
  const supa = getSupabase();
  if (!supa || !jobIds.length) return [];
  const { data } = await supa
    .from('content_patch')
    .select('id,created_at,lesson_id,scope,item_id,value,swaps')
    .in('job_id', jobIds)
    .eq('active', true)
    .order('created_at', { ascending: true });
  return (data ?? []) as ContentPatch[];
}

/**
 * An admin's answer to one of the AI's questions. "yes" stores the proposed version of that
 * place (live for everyone); either way the question is removed, and the job is done once none are left.
 */
export async function answerQuestion(job: AiJob, q: FollowupQuestion, yes: boolean): Promise<{ ok: boolean; patch?: ContentPatch }> {
  const supa = getSupabase();
  if (!supa) return { ok: false };
  let patch: ContentPatch | undefined;
  if (yes) {
    const { data, error } = await supa
      .from('content_patch')
      .insert({ job_id: job.id, lesson_id: q.lessonId, scope: 'item', item_id: q.itemId, value: q.value })
      .select('id,created_at,lesson_id,scope,item_id,value,swaps')
      .single();
    if (error) return { ok: false };
    patch = data as ContentPatch;
  }
  const rest = (job.questions ?? []).filter((x) => x.ref !== q.ref);
  const { error } = await supa
    .from('ai_job')
    .update({ questions: rest.length ? rest : null, status: rest.length ? 'review' : 'live', updated_at: new Date().toISOString() })
    .eq('id', job.id);
  return { ok: !error, patch };
}

/** Marks an AI edit's word swaps as handed over to the follow-up check. */
export async function clearPendingSwaps(jobId: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { error } = await supa.from('ai_job').update({ pending_swaps: null }).eq('id', jobId);
  return !error;
}

/** Asks the server to rewrite the style guide from all observations (runs in the background). */
export async function rebuildStyleGuide(): Promise<{ ok: boolean; error?: string }> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, error: 'not_signed_in' };
  try {
    const res = await fetch('/api/style-guide', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true } : { ok: false, error: body.error ?? `http_${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

export async function loadStyleGuide(): Promise<{ text: string; created_at: string; entries: number } | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from('style_guide').select('text,created_at,entries').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data as { text: string; created_at: string; entries: number } | null) ?? null;
}

// ---------- ✨ new lessons ----------

/** Asks the AI to write a new lesson for a level (runs in the background, see api/ai-lesson.ts). */
export async function submitAiLesson(input: NewLessonInput): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const supa = getSupabase();
  const token = supa ? (await supa.auth.getSession()).data.session?.access_token : undefined;
  if (!token) return { ok: false, error: 'not_signed_in' };
  try {
    const res = await fetch('/api/ai-lesson', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `http_${res.status}` };
    return { ok: true, jobId: body.jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

/** The lessons these jobs wrote (to show them without a reload). */
export async function loadJobLessons(jobIds: string[]): Promise<AiLessonRow[]> {
  const supa = getSupabase();
  if (!supa || !jobIds.length) return [];
  const { data } = await supa.from('ai_lesson').select('id,created_at,value').in('job_id', jobIds).eq('active', true);
  return (data ?? []) as AiLessonRow[];
}
