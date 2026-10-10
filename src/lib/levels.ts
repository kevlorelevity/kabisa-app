import type { Lesson, LevelInfo } from '../types';
import levelsJson from '../../content/levels.json';
import { PASS_THRESHOLD, getLessonScores, isLessonDone, isLessonPassed, type LessonScoreRecord } from './lessonScores';

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

/**
 * XP a lesson counts towards its level's target: capped at what passing it is
 * worth (PASS_THRESHOLD of the section XP + the pass bonus). An un-passed lesson
 * can never reach that cap, so a level's bar is full exactly when every lesson
 * in it is passed — i.e. when the learner moves up a level.
 */
export function lessonPassXp(): number {
  return Math.round(PASS_THRESHOLD * (XP_DIALOGUE + XP_PRACTICE)) + XP_PASS_BONUS;
}

export interface LevelXp {
  level: number;
  /** XP earned towards this level's target. */
  earned: number;
  /** XP needed to clear the level (every lesson passed). */
  required: number;
}

/**
 * What a level is worth in total. Fixed (content/levels.json): when a lesson is added to a
 * level, each lesson's share of it gets smaller instead of the level getting bigger.
 */
export function levelTotalXp(lessons: Lesson[], level: number): number {
  return levelInfo(level).xp ?? lessonsInLevel(lessons, level).length * lessonPassXp();
}

/** How much one lesson's raw XP counts in its level (1 when the level has its original lesson count). */
function lessonScale(lessons: Lesson[], level: number): number {
  const n = lessonsInLevel(lessons, level).length;
  return n ? levelTotalXp(lessons, level) / (n * lessonPassXp()) : 1;
}

/** A lesson's XP and its maximum, in its level's share (for the lesson card). */
export function lessonPoints(lessons: Lesson[], lesson: Lesson): { xp: number; max: number } {
  const k = lessonScale(lessons, lesson.level);
  return { xp: Math.round(lessonXp(lesson) * k), max: Math.round(maxLessonXp() * k) };
}

export function levelXp(lessons: Lesson[], level: number): LevelXp {
  const ls = lessonsInLevel(lessons, level);
  const cap = lessonPassXp();
  const required = levelTotalXp(lessons, level);
  // A cleared level (every lesson passed, or a later-added one optional for this learner) is full.
  if (ls.length && ls.every((l) => isLessonDone(lessons, l))) return { level, earned: required, required };
  const k = lessonScale(lessons, level);
  const earned = Math.round(ls.reduce((sum, l) => sum + Math.min(lessonXp(l), cap), 0) * k);
  return { level, earned: Math.min(earned, required), required };
}

export function totalXp(lessons: Lesson[]): number {
  let sum = 0;
  for (const level of new Set(lessons.map((l) => l.level))) {
    const ls = lessonsInLevel(lessons, level);
    const raw = Math.round(ls.reduce((n, l) => n + lessonXp(l), 0) * lessonScale(lessons, level));
    const cleared = ls.every((l) => isLessonDone(lessons, l));
    sum += cleared ? Math.max(raw, levelTotalXp(lessons, level)) : raw;
  }
  return sum;
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
  const passed = ls.filter((l) => isLessonDone(lessons, l)).length;
  return { level, passed, total: ls.length, complete: ls.length > 0 && passed === ls.length };
}

/**
 * The level the learner is working in: the level of their first un-passed
 * lesson (lessons unlock in order). Once everything is passed, the top level.
 */
export function currentLevel(lessons: Lesson[]): number {
  const next = lessons.find((l) => !isLessonDone(lessons, l));
  return next ? next.level : (lessons[lessons.length - 1]?.level ?? 1);
}

/** True when every lesson in the course has been passed. */
export function courseComplete(lessons: Lesson[]): boolean {
  return lessons.length > 0 && lessons.every((l) => isLessonDone(lessons, l));
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
  kitchen: { label: 'Kitchen & cooking', emoji: '🍲' },
  weather: { label: 'Weather', emoji: '🌦️' },
  routine: { label: 'Daily routine', emoji: '⏰' },
  safari: { label: 'Animals & safari', emoji: '🦒' },
  school: { label: 'School', emoji: '🏫' },
  travel: { label: 'Travel', emoji: '🧳' },
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
