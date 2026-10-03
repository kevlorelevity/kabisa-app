import type { Lesson, LevelInfo } from '../types';
import levelsJson from '../../content/levels.json';
import { getLessonScores, isLessonPassed, type LessonScoreRecord } from './lessonScores';

// -------- Levels & XP (gamification) --------
//
// Ten levels with (deliberately silly) names live in content/levels.json.
// Each lesson belongs to one level. XP is derived from the best scores the
// learner already has in lessonScores, so it never needs its own storage and
// can't drift out of sync. Only "which level-ups have I celebrated?" is stored.

export const LEVELS: LevelInfo[] = levelsJson as LevelInfo[];
export const MAX_LEVEL = LEVELS.length;

/** XP for a lesson: up to 60 for the conversation, 40 for the practice, +50 for passing. */
export const XP_DIALOGUE = 60;
export const XP_PRACTICE = 40;
export const XP_PASS_BONUS = 50;

const SEEN_KEY = 'ksa_levelups_seen';

export function levelInfo(level: number): LevelInfo {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}

export function lessonXp(lesson: Lesson, rec: LessonScoreRecord = getLessonScores(lesson.id)): number {
  const hasPractice = Boolean(lesson.practice?.length);
  const d = (rec.dialogue?.best ?? 0) * (hasPractice ? XP_DIALOGUE : XP_DIALOGUE + XP_PRACTICE);
  const p = hasPractice ? (rec.practice?.best ?? 0) * XP_PRACTICE : 0;
  return Math.round(d + p) + (isLessonPassed(lesson, rec) ? XP_PASS_BONUS : 0);
}

export function maxLessonXp(): number {
  return XP_DIALOGUE + XP_PRACTICE + XP_PASS_BONUS;
}

export function totalXp(lessons: Lesson[]): number {
  return lessons.reduce((sum, l) => sum + lessonXp(l), 0);
}

export function lessonsInLevel(lessons: Lesson[], level: number): Lesson[] {
  return lessons.filter((l) => l.level === level);
}

export interface LevelProgress {
  level: number;
  passed: number;
  total: number;
  complete: boolean;
}

export function levelProgress(lessons: Lesson[], level: number): LevelProgress {
  const ls = lessonsInLevel(lessons, level);
  const passed = ls.filter((l) => isLessonPassed(l)).length;
  return { level, passed, total: ls.length, complete: ls.length > 0 && passed === ls.length };
}

/**
 * The level the learner is working in: the level of their first un-passed
 * lesson (lessons unlock in order). Once everything is passed, the top level.
 */
export function currentLevel(lessons: Lesson[]): number {
  const next = lessons.find((l) => !isLessonPassed(l));
  return next ? next.level : (lessons[lessons.length - 1]?.level ?? 1);
}

/** True when every lesson in the course has been passed. */
export function courseComplete(lessons: Lesson[]): boolean {
  return lessons.length > 0 && lessons.every((l) => isLessonPassed(l));
}

/** How many times this lesson's theme has come up so far (1 = first visit). */
export function themeVisit(lessons: Lesson[], lesson: Lesson): number {
  if (!lesson.theme) return 1;
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  return lessons.slice(0, idx + 1).filter((l) => l.theme === lesson.theme).length;
}

export const THEME_LABELS: Record<string, { label: string; emoji: string }> = {
  uber: { label: 'Uber rides', emoji: '🚕' },
  greetings: { label: 'Greetings', emoji: '👋' },
  market: { label: 'Market', emoji: '🧺' },
  people: { label: 'People', emoji: '👨‍👩‍👧' },
  directions: { label: 'Directions', emoji: '🧭' },
  transport: { label: 'Matatu', emoji: '🚐' },
  food: { label: 'Eating out', emoji: '🍛' },
  friends: { label: 'Friends', emoji: '🎉' },
  health: { label: 'Health', emoji: '🩺' },
  car: { label: 'Car', emoji: '⛽' },
  home: { label: 'Home', emoji: '🏠' },
  police: { label: 'Police', emoji: '👮' },
  work: { label: 'Work', emoji: '💼' },
  news: { label: 'News & chat', emoji: '📰' },
  community: { label: 'Community', emoji: '🤝' },
  sports: { label: 'Football', emoji: '⚽' },
};

function readSeen(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

/**
 * Returns the level that was just completed and hasn't been celebrated yet
 * (and marks it celebrated), or null. Call after recording a score.
 */
export function claimLevelUp(lessons: Lesson[], level: number): number | null {
  if (!levelProgress(lessons, level).complete) return null;
  const seen = readSeen();
  if (seen.includes(level)) return null;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, level]));
  } catch {
    // Storage unavailable — the celebration may show again; harmless.
  }
  return level;
}
