import type { Lesson } from '../types';
import { isRoaming } from './roam';

// -------- Lesson scores, gating and weak-phrase tracking --------
//
// Local-only (localStorage), like isLessonComplete in storage.ts — lessons
// aren't in Supabase yet. Each lesson keeps its best first-try score for the
// conversation and the practice session; the next lesson unlocks only once
// both clear PASS_THRESHOLD. Items the learner misses are remembered as
// "weak" and feed the adaptive drill (see lib/drill.ts) until mastered.

/** Share of first-try-correct answers needed on BOTH the conversation and the practice. */
export const PASS_THRESHOLD = 0.75;

/** After this many below-threshold attempts on a lesson, the drill is pushed as the main next step. */
export const STRUGGLE_ATTEMPTS = 2;

const KEY = 'ksa_lesson_scores';

export interface SectionScore {
  /** Best first-try ratio, 0–1. */
  best: number;
  /** Most recent first-try ratio, 0–1. */
  last: number;
  attempts: number;
  /** Attempts that finished below PASS_THRESHOLD. */
  failed: number;
}

export interface LessonScoreRecord {
  dialogue?: SectionScore;
  practice?: SectionScore;
  /** Dialogue turn ids the learner has missed and not yet mastered. */
  weakTurns: string[];
  /** Practice item ids the learner has missed and not yet mastered. */
  weakPractice: string[];
}

type Store = Record<string, LessonScoreRecord>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

/** Fired on window whenever scores change, so always-visible UI (the nav's level bar) can refresh. */
export const SCORES_CHANGED_EVENT = 'ksa:scores-changed';

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode etc.) — progress just won't persist.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SCORES_CHANGED_EVENT));
}

function empty(): LessonScoreRecord {
  return { weakTurns: [], weakPractice: [] };
}

export function getLessonScores(lessonId: string): LessonScoreRecord {
  return { ...empty(), ...(read()[lessonId] ?? {}) };
}

function bump(prev: SectionScore | undefined, ratio: number): SectionScore {
  return {
    best: Math.max(prev?.best ?? 0, ratio),
    last: ratio,
    attempts: (prev?.attempts ?? 0) + 1,
    failed: (prev?.failed ?? 0) + (ratio < PASS_THRESHOLD ? 1 : 0),
  };
}

/** Missed ids become weak; ids answered right first time stop being weak. */
function mergeWeak(current: string[], attempted: string[], missed: string[]): string[] {
  const missedSet = new Set(missed);
  const clearedSet = new Set(attempted.filter((id) => !missedSet.has(id)));
  const next = current.filter((id) => !clearedSet.has(id));
  for (const id of missed) if (!next.includes(id)) next.push(id);
  return next;
}

export interface AttemptResult {
  firstTryCorrect: number;
  total: number;
  /** Ids of every item in this attempt. */
  attemptedIds: string[];
  /** Ids missed on the first try. */
  missedIds: string[];
}

export function recordDialogueAttempt(lessonId: string, r: AttemptResult): LessonScoreRecord {
  const store = read();
  const rec = { ...empty(), ...(store[lessonId] ?? {}) };
  rec.dialogue = bump(rec.dialogue, r.total ? r.firstTryCorrect / r.total : 1);
  rec.weakTurns = mergeWeak(rec.weakTurns, r.attemptedIds, r.missedIds);
  store[lessonId] = rec;
  write(store);
  return rec;
}

export function recordPracticeAttempt(lessonId: string, r: AttemptResult): LessonScoreRecord {
  const store = read();
  const rec = { ...empty(), ...(store[lessonId] ?? {}) };
  rec.practice = bump(rec.practice, r.total ? r.firstTryCorrect / r.total : 1);
  rec.weakPractice = mergeWeak(rec.weakPractice, r.attemptedIds, r.missedIds);
  store[lessonId] = rec;
  write(store);
  return rec;
}

/** Called when the drill has walked a phrase through all its recall intervals. */
export function recordDrillMastered(lessonId: string, turnIds: string[], practiceIds: string[]): void {
  const store = read();
  const rec = { ...empty(), ...(store[lessonId] ?? {}) };
  rec.weakTurns = rec.weakTurns.filter((id) => !turnIds.includes(id));
  rec.weakPractice = rec.weakPractice.filter((id) => !practiceIds.includes(id));
  store[lessonId] = rec;
  write(store);
}

export function sectionPassed(score: SectionScore | undefined): boolean {
  return (score?.best ?? 0) >= PASS_THRESHOLD;
}

/** A lesson is passed when its conversation AND (if it has one) its practice clear the threshold. */
export function isLessonPassed(lesson: Lesson, rec = getLessonScores(lesson.id)): boolean {
  const practiceOk = lesson.practice?.length ? sectionPassed(rec.practice) : true;
  return sectionPassed(rec.dialogue) && practiceOk;
}

/**
 * The first lesson is always open; every later one needs the previous lesson passed.
 * Admins in Roam mode get every lesson open.
 */
export function isLessonUnlocked(lessons: Lesson[], lessonId: string): boolean {
  if (isRoaming()) return true;
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return isLessonPassed(lessons[idx - 1]);
}

/** Has the learner fallen below the bar repeatedly on either section? */
export function isStruggling(rec: LessonScoreRecord): boolean {
  const failed = (rec.dialogue?.failed ?? 0) + (rec.practice?.failed ?? 0);
  return failed >= STRUGGLE_ATTEMPTS;
}

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
