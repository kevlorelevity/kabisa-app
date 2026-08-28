import type { ModuleProgress, CardState, Module } from './types';

const PROGRESS_KEY = 'ksa_progress';
const SRS_KEY = 'ksa_srs';
const MIGRATION_KEY = 'ksa_srs_migrated_v1';
const LESSON_PROGRESS_KEY = 'ksa_lesson_progress';

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getModuleProgress(moduleId: string): ModuleProgress | null {
  const all = readJSON<Record<string, ModuleProgress>>(PROGRESS_KEY) ?? {};
  return all[moduleId] ?? null;
}

export function setModuleProgress(moduleId: string, progress: ModuleProgress): void {
  const all = readJSON<Record<string, ModuleProgress>>(PROGRESS_KEY) ?? {};
  all[moduleId] = progress;
  writeJSON(PROGRESS_KEY, all);
}

export function getAllSRSCards(): Record<string, CardState> {
  return readJSON<Record<string, CardState>>(SRS_KEY) ?? {};
}

export function getSRSCard(cardKey: string): CardState | null {
  const all = getAllSRSCards();
  return all[cardKey] ?? null;
}

export function setSRSCard(cardKey: string, state: CardState): void {
  const all = getAllSRSCards();
  all[cardKey] = state;
  writeJSON(SRS_KEY, all);
}

/**
 * One-time migration from the legacy SRS key format
 * (`${moduleId}:${vocabIndex}`) to stable vocab UUIDs. Runs idempotently:
 * a `MIGRATION_KEY` flag in localStorage prevents repeat runs.
 *
 * Unresolvable legacy keys are dropped. The prototype had no real users
 * at the time of the cutover, so this is acceptable — documented in the
 * implementation plan.
 */
export function migrateLegacySRSKeys(modules: Module[]): void {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const cards = getAllSRSCards();
  const migrated: Record<string, CardState> = {};

  for (const [key, state] of Object.entries(cards)) {
    // Already a UUID (8-4-4-4-12 hex) — keep as-is.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
      migrated[key] = state;
      continue;
    }

    // Legacy format: `${moduleId}:${vocabIndex}` — resolve through module data.
    const [moduleId, indexStr] = key.split(':');
    const idx = parseInt(indexStr, 10);
    const mod = modules.find((m) => m.id === moduleId);
    const entry = mod?.vocabulary[idx];
    if (entry?.id) {
      migrated[entry.id] = state;
    }
    // else: drop the entry silently.
  }

  writeJSON(SRS_KEY, migrated);
  localStorage.setItem(MIGRATION_KEY, '1');
}


// -------- Lesson progress (Lessons surface — local-only for now) --------
//
// Lessons aren't seeded into Supabase yet (see useLessons.ts), so their
// progress can't ride module_progress (its module_id has an FK to the
// `module` table). Tracked here, keyed by lesson slug, until lessons get
// their own DB schema.

export function isLessonComplete(lessonId: string): boolean {
  const all = readJSON<Record<string, boolean>>(LESSON_PROGRESS_KEY) ?? {};
  return all[lessonId] === true;
}

export function setLessonComplete(lessonId: string): void {
  const all = readJSON<Record<string, boolean>>(LESSON_PROGRESS_KEY) ?? {};
  all[lessonId] = true;
  writeJSON(LESSON_PROGRESS_KEY, all);
}
