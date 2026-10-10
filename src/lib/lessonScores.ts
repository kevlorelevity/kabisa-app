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

// ---- lessons added to a level later (✨ new lessons from admins) ----
//
// A level keeps its total XP when a lesson is added to it. Learners who had already cleared the
// level aren't sent back: for them the new lesson is optional (open, never blocking). Everyone
// who reaches the level after the lesson was added does it like any other lesson.

const CLEARED_KEY = 'ksa_levels_cleared';
const SEEN_KEY = 'ksa_levelups_seen';

/** When each level was cleared on this device (ISO time). Celebrated level-ups count as cleared long ago. */
export function getLevelClears(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const lvl of JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as number[]) out[String(lvl)] = '2000-01-01T00:00:00.000Z';
    Object.assign(out, JSON.parse(localStorage.getItem(CLEARED_KEY) ?? '{}') as Record<string, string>);
  } catch {
    /* storage unavailable */
  }
  return out;
}

/** Remembers the first time each level had every lesson done. Call when scores change. */
export function recordLevelClears(lessons: Lesson[]): void {
  const clears = getLevelClears();
  let changed = false;
  for (const level of new Set(lessons.map((l) => l.level))) {
    if (clears[String(level)]) continue;
    const ls = lessons.filter((l) => l.level === level);
    if (ls.length && ls.every((l) => isLessonDone(lessons, l))) {
      clears[String(level)] = new Date().toISOString();
      changed = true;
    }
  }
  if (!changed) return;
  try {
    localStorage.setItem(CLEARED_KEY, JSON.stringify(clears));
  } catch {
    /* storage unavailable */
  }
}

const attempts = (id: string) => {
  const r = getLessonScores(id);
  return (r.dialogue?.attempts ?? 0) + (r.practice?.attempts ?? 0);
};

/**
 * A lesson added after this learner had cleared its level: optional for them. They had cleared it
 * if every lesson that was there before is done AND they either already played a higher level
 * (gating proves they got through) or this device saw the level cleared before the lesson came.
 */
export function isLessonOptional(lessons: Lesson[], lesson: Lesson): boolean {
  const added = lesson.addedAt;
  if (!added || isRoaming() || isLessonPassed(lesson)) return false;
  const before = lessons.filter((l) => l.level === lesson.level && l.id !== lesson.id && !(l.addedAt && l.addedAt >= added));
  if (!before.every((l) => isLessonDone(lessons, l))) return false;
  if (lessons.some((l) => l.level > lesson.level && attempts(l.id) > 0)) return true;
  const cleared = getLevelClears()[String(lesson.level)];
  return Boolean(cleared && cleared < added);
}

/** Passed, or optional for this learner — either way it doesn't hold them back. */
export function isLessonDone(lessons: Lesson[], lesson: Lesson): boolean {
  return isLessonPassed(lesson) || isLessonOptional(lessons, lesson);
}

/**
 * The first lesson is always open; every later one needs the previous lesson done.
 * Admins in Roam mode get every lesson open.
 */
export function isLessonUnlocked(lessons: Lesson[], lessonId: string): boolean {
  if (isRoaming()) return true;
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return isLessonDone(lessons, lessons[idx - 1]);
}

/** Has the learner fallen below the bar repeatedly on either section? */
export function isStruggling(rec: LessonScoreRecord): boolean {
  const failed = (rec.dialogue?.failed ?? 0) + (rec.practice?.failed ?? 0);
  return failed >= STRUGGLE_ATTEMPTS;
}

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Every lesson's record on this device (for syncing to Supabase). */
export function getAllLessonScores(): Record<string, LessonScoreRecord> {
  return read();
}

/** Replaces this device's scores wholesale (after merging with Supabase). */
export function replaceAllLessonScores(store: Record<string, LessonScoreRecord>): void {
  write(store);
}
