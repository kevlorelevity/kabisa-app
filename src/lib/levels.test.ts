import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lesson } from '../types';
import { claimLevelUp, currentLevel, lessonPoints, lessonXp, levelProgress, levelXp, themeVisit, totalXp } from './levels';
import { isLessonOptional, isLessonUnlocked, recordDialogueAttempt, recordLevelClears, recordPracticeAttempt } from './lessonScores';

function lesson(id: string, level: number, theme?: string): Lesson {
  return {
    id, uuid: id, title: id, category: 'social', difficulty: 'beginner', level, theme, order: level * 100,
    culturalNote: '', startingPoint: '', turns: [], vocabulary: [],
    practice: [{ id: `${id}-p`, mode: 'translate', english: '', before: '', after: '', options: [{ text: 'a', correct: true }], explanation: '' }],
  };
}

const pass = (id: string) => {
  const r = { firstTryCorrect: 4, total: 4, attemptedIds: [], missedIds: [] };
  recordDialogueAttempt(id, r);
  recordPracticeAttempt(id, r);
};

describe('levels', () => {
  beforeEach(() => localStorage.clear());
  const ls = [lesson('a', 1, 'uber'), lesson('b', 1), lesson('c', 2, 'uber')];

  it('starts at level 1 with no XP', () => {
    expect(currentLevel(ls)).toBe(1);
    expect(totalXp(ls)).toBe(0);
  });

  it('awards XP from best scores plus a pass bonus', () => {
    pass('a');
    expect(lessonXp(ls[0])).toBe(150);
    expect(levelProgress(ls, 1)).toMatchObject({ passed: 1, total: 2, complete: false });
  });

  it('fills the level XP bar exactly when every lesson in the level is passed', () => {
    // Level 1 is worth a fixed 500 XP (content/levels.json), shared by its lessons.
    expect(levelXp(ls, 1)).toEqual({ level: 1, earned: 0, required: 500 });
    // A near-perfect but un-passed lesson stays below one lesson's share.
    recordDialogueAttempt('a', { firstTryCorrect: 4, total: 4, attemptedIds: [], missedIds: [] });
    recordPracticeAttempt('a', { firstTryCorrect: 2, total: 4, attemptedIds: [], missedIds: [] });
    expect(levelXp(ls, 1).earned).toBeLessThan(250);
    pass('a');
    pass('b');
    const xp = levelXp(ls, 1);
    expect(xp.earned).toBe(xp.required);
  });

  it('moves to the next level and celebrates exactly once', () => {
    pass('a');
    expect(claimLevelUp(ls, 1)).toBeNull();
    pass('b');
    expect(currentLevel(ls)).toBe(2);
    expect(claimLevelUp(ls, 1)).toBe(1);
    expect(claimLevelUp(ls, 1)).toBeNull();
  });

  it('counts returning themes', () => {
    expect(themeVisit(ls, ls[0])).toBe(1);
    expect(themeVisit(ls, ls[2])).toBe(2);
  });

  describe('a lesson added to a level later', () => {
    const added = { ...lesson('new', 1), order: 150, addedAt: '2026-10-10T12:00:00.000Z' };
    const withNew = [ls[0], ls[1], added, ls[2]];

    it('keeps the level total and shares it out more thinly', () => {
      expect(levelXp(withNew, 1).required).toBe(500);
      pass('a');
      expect(lessonPoints(ls, ls[0])).toEqual({ xp: 300, max: 300 }); // 500 XP over 2 lessons
      expect(lessonPoints(withNew, ls[0])).toEqual({ xp: 200, max: 200 }); // … over 3 lessons
    });

    it('is required for learners who reach the level after it was added', () => {
      pass('a');
      pass('b');
      expect(isLessonOptional(withNew, added)).toBe(false);
      expect(currentLevel(withNew)).toBe(1);
      expect(isLessonUnlocked(withNew, 'c')).toBe(false);
    });

    it('is optional for learners who had already cleared the level — no going back, full level XP kept', () => {
      pass('a');
      pass('b');
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-09'));
      recordLevelClears(ls); // cleared before the new lesson existed
      vi.setSystemTime(new Date('2026-10-11'));
      expect(isLessonOptional(withNew, added)).toBe(true);
      expect(currentLevel(withNew)).toBe(2);
      expect(isLessonUnlocked(withNew, 'c')).toBe(true);
      expect(isLessonUnlocked(withNew, 'new')).toBe(true);
      expect(levelXp(withNew, 1)).toEqual({ level: 1, earned: 500, required: 500 });
      vi.useRealTimers();
    });

    it('is optional for anyone already playing a higher level', () => {
      pass('a');
      pass('b');
      recordDialogueAttempt('c', { firstTryCorrect: 1, total: 4, attemptedIds: [], missedIds: [] });
      expect(isLessonOptional(withNew, added)).toBe(true);
    });
  });
});
