/**
 * Per-account progress + SRS persistence.
 *
 * Mirrors the null-safe wrapper style in `lib/auth.ts`: every function
 * returns early with a harmless empty default when Supabase isn't
 * configured, and logs (never throws) on a query error. Callers branch on
 * `isSupabaseConfigured()` themselves and fall back to `storage.ts` for the
 * offline/local-dev path — this file only ever talks to Supabase.
 */

import { getSupabase } from './supabase';
import type { ModuleProgress, CardState } from '../types';

// ---- DB row shapes (snake_case mirror of db/migrations/001_init.sql) ----

interface ModuleProgressRow {
  module_id: string; // module.uuid
  status: ModuleProgress['status'];
  added_to_review: boolean;
  last_reviewed: string | null;
}

interface SRSCardRow {
  vocab_id: string; // vocab_entry.id
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  next_review: string;
}

function rowToProgress(r: ModuleProgressRow): ModuleProgress {
  return {
    status: r.status,
    addedToReview: r.added_to_review,
    lastReviewed: r.last_reviewed,
  };
}

function rowToCardState(r: SRSCardRow): CardState {
  return {
    interval: r.interval_days,
    easeFactor: r.ease_factor,
    repetitions: r.repetitions,
    nextReview: r.next_review,
  };
}

// ---- Module progress ----

/** All module_progress rows for this account, keyed by module.uuid. */
export async function fetchAllModuleProgress(
  userId: string,
): Promise<Record<string, ModuleProgress>> {
  const supa = getSupabase();
  if (!supa) return {};

  const { data, error } = await supa
    .from('module_progress')
    .select('module_id, status, added_to_review, last_reviewed')
    .eq('account_id', userId);

  if (error) {
    console.error('[progress] fetchAllModuleProgress failed:', error);
    return {};
  }

  const out: Record<string, ModuleProgress> = {};
  for (const row of (data ?? []) as ModuleProgressRow[]) {
    out[row.module_id] = rowToProgress(row);
  }
  return out;
}

/** Single module_progress row for this account+module, or null if absent. */
export async function fetchModuleProgress(
  userId: string,
  moduleUuid: string,
): Promise<ModuleProgress | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const { data, error } = await supa
    .from('module_progress')
    .select('module_id, status, added_to_review, last_reviewed')
    .eq('account_id', userId)
    .eq('module_id', moduleUuid)
    .maybeSingle();

  if (error) {
    console.error('[progress] fetchModuleProgress failed:', error);
    return null;
  }
  return data ? rowToProgress(data as ModuleProgressRow) : null;
}

export async function upsertModuleProgress(
  userId: string,
  moduleUuid: string,
  progress: ModuleProgress,
): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;

  const { error } = await supa.from('module_progress').upsert(
    {
      account_id: userId,
      module_id: moduleUuid,
      status: progress.status,
      added_to_review: progress.addedToReview,
      last_reviewed: progress.lastReviewed,
    },
    { onConflict: 'account_id,module_id' },
  );

  if (error) {
    console.error('[progress] upsertModuleProgress failed:', error);
  }
}

// ---- SRS cards ----

/** All srs_card rows for this account, keyed by vocab_entry.id. */
export async function fetchAllSRSCards(
  userId: string,
): Promise<Record<string, CardState>> {
  const supa = getSupabase();
  if (!supa) return {};

  const { data, error } = await supa
    .from('srs_card')
    .select('vocab_id, interval_days, ease_factor, repetitions, next_review')
    .eq('account_id', userId);

  if (error) {
    console.error('[progress] fetchAllSRSCards failed:', error);
    return {};
  }

  const out: Record<string, CardState> = {};
  for (const row of (data ?? []) as SRSCardRow[]) {
    out[row.vocab_id] = rowToCardState(row);
  }
  return out;
}

export async function upsertSRSCard(
  userId: string,
  vocabId: string,
  state: CardState,
): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;

  const { error } = await supa.from('srs_card').upsert(
    {
      account_id: userId,
      vocab_id: vocabId,
      interval_days: state.interval,
      ease_factor: state.easeFactor,
      repetitions: state.repetitions,
      next_review: state.nextReview,
    },
    { onConflict: 'account_id,vocab_id' },
  );

  if (error) {
    console.error('[progress] upsertSRSCard failed:', error);
  }
}

/**
 * Seed many SRS cards in one round trip (used by "Add vocabulary to review
 * queue" — every vocab entry in a module gets a fresh card at once).
 */
export async function upsertSRSCardsBatch(
  userId: string,
  entries: Array<{ vocabId: string; state: CardState }>,
): Promise<void> {
  const supa = getSupabase();
  if (!supa || entries.length === 0) return;

  const rows = entries.map(({ vocabId, state }) => ({
    account_id: userId,
    vocab_id: vocabId,
    interval_days: state.interval,
    ease_factor: state.easeFactor,
    repetitions: state.repetitions,
    next_review: state.nextReview,
  }));

  const { error } = await supa
    .from('srs_card')
    .upsert(rows, { onConflict: 'account_id,vocab_id' });

  if (error) {
    console.error('[progress] upsertSRSCardsBatch failed:', error);
  }
}
