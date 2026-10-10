import type { Lesson } from '../types';
import { getSupabase } from './supabase';
import {
  SCORES_CHANGED_EVENT,
  getAllLessonScores,
  isLessonDone,
  isLessonPassed,
  recordLevelClears,
  replaceAllLessonScores,
  type LessonScoreRecord,
  type SectionScore,
} from './lessonScores';
import { courseComplete, currentLevel, levelInfo, totalXp } from './levels';

// -------- Lesson scores ⇄ Supabase --------
//
// localStorage stays the app's working copy (fast, works offline). When a
// learner is signed in we:
//   1. pull their lesson_score rows and merge them with this device's scores
//      (best-of, so nothing is ever lost), save the merge locally,
//   2. upload any lesson whose merged record differs from the server's, and
//   3. keep a one-row summary (level, XP, lessons passed…) in learner_progress.
// After that, every score change is uploaded a moment later.
//
// Scores already on a device from before sync existed belong to whoever signs
// in there first. If a different account then signs in on the same browser,
// we load that account's scores from the server instead of mixing them.

type Store = Record<string, LessonScoreRecord>;

const OWNER_KEY = 'ksa_scores_owner';

function getOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function setOwner(id: string): void {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    /* ignore */
  }
}

function mergeSection(a?: SectionScore, b?: SectionScore): SectionScore | undefined {
  if (!a) return b;
  if (!b) return a;
  const newer = b.attempts > a.attempts ? b : a;
  return {
    best: Math.max(a.best, b.best),
    last: newer.last,
    attempts: Math.max(a.attempts, b.attempts),
    failed: Math.max(a.failed, b.failed),
  };
}

const attemptsOf = (r?: LessonScoreRecord) => (r?.dialogue?.attempts ?? 0) + (r?.practice?.attempts ?? 0);

/** Best-of merge of two copies of the same lesson's record. */
export function mergeRecords(a?: LessonScoreRecord, b?: LessonScoreRecord): LessonScoreRecord {
  if (!a) return b ?? { weakTurns: [], weakPractice: [] };
  if (!b) return a;
  // Weak items come from whichever copy has seen more play.
  const newer = attemptsOf(b) > attemptsOf(a) ? b : a;
  const out: LessonScoreRecord = { weakTurns: [...newer.weakTurns], weakPractice: [...newer.weakPractice] };
  const d = mergeSection(a.dialogue, b.dialogue);
  const p = mergeSection(a.practice, b.practice);
  if (d) out.dialogue = d;
  if (p) out.practice = p;
  return out;
}

export function mergeStores(local: Store, remote: Store): Store {
  const out: Store = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    out[id] = mergeRecords(local[id], remote[id]);
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The summary row for learner_progress, from this device's (merged) scores. */
export function progressSummary(lessons: Lesson[], store: Store) {
  const level = currentLevel(lessons);
  const passed = lessons.filter((l) => isLessonDone(lessons, l)).length;
  const started = lessons.filter((l) => attemptsOf(store[l.id]) > 0).length;
  return {
    level,
    level_name: levelInfo(level).name,
    xp: totalXp(lessons),
    lessons_passed: passed,
    lessons_started: started,
    lessons_total: lessons.length,
    next_lesson_id: lessons.find((l) => !isLessonDone(lessons, l))?.id ?? null,
    course_complete: courseComplete(lessons),
  };
}

/**
 * Starts syncing for a signed-in learner. Returns a stop function.
 * `getLessons` is read each time so personalised/edited lessons stay current.
 */
export function startProgressSync(userId: string, getLessons: () => Lesson[]): () => void {
  const supa = getSupabase();
  if (!supa) return () => {};
  let stopped = false;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // What the server holds, as far as we know — so we only upload changes.
  const serverCopy: Store = {};
  let serverSummary: unknown = null;

  async function push() {
    if (stopped || !ready || !supa) return;
    const store = getAllLessonScores();
    const lessons = getLessons();
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const rows = Object.entries(store)
      .filter(([id, rec]) => !same(rec, serverCopy[id]))
      .map(([id, rec]) => {
        const lesson = byId.get(id);
        return {
          account_id: userId,
          lesson_id: id,
          record: rec,
          dialogue_best: rec.dialogue?.best ?? null,
          practice_best: rec.practice?.best ?? null,
          attempts: attemptsOf(rec),
          passed: lesson ? isLessonPassed(lesson, rec) : false,
          updated_at: new Date().toISOString(),
        };
      });
    if (rows.length) {
      const { error } = await supa.from('lesson_score').upsert(rows);
      if (error) console.error('[progressSync] lesson_score upsert failed:', error);
      else for (const r of rows) serverCopy[r.lesson_id] = r.record;
    }
    recordLevelClears(lessons);
    const summary = progressSummary(lessons, store);
    if (!same(summary, serverSummary)) {
      const { error } = await supa
        .from('learner_progress')
        .upsert({ account_id: userId, ...summary, updated_at: new Date().toISOString() });
      if (error) console.error('[progressSync] learner_progress upsert failed:', error);
      else serverSummary = summary;
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void push(), 1200);
  }

  async function init() {
    if (!supa) return;
    const { data, error } = await supa.from('lesson_score').select('lesson_id, record').eq('account_id', userId);
    if (stopped) return;
    if (error) {
      console.error('[progressSync] could not load scores:', error);
      return; // keep working locally; try again next sign-in / page load
    }
    const remote: Store = {};
    for (const row of data ?? []) remote[row.lesson_id as string] = row.record as LessonScoreRecord;
    Object.assign(serverCopy, remote);

    const owner = getOwner();
    const local = owner && owner !== userId ? {} : getAllLessonScores();
    const merged = mergeStores(local, remote);
    setOwner(userId);
    if (!same(merged, getAllLessonScores())) replaceAllLessonScores(merged);
    ready = true;
    await push();
  }

  const onChange = () => schedule();
  window.addEventListener(SCORES_CHANGED_EVENT, onChange);
  void init();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    window.removeEventListener(SCORES_CHANGED_EVENT, onChange);
  };
}
