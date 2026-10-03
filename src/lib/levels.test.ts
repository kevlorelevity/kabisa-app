import { beforeEach, describe, expect, it } from 'vitest';
import type { Lesson } from '../types';
import { claimLevelUp, currentLevel, lessonPassXp, lessonXp, levelProgress, levelXp, themeVisit, totalXp } from './levels';
import { recordDialogueAttempt, recordPracticeAttempt } from './lessonScores';

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
    expect(levelXp(ls, 1)).toEqual({ level: 1, earned: 0, required: 2 * lessonPassXp() });
    // A near-perfect but un-passed lesson stays below one lesson's share.
    recordDialogueAttempt('a', { firstTryCorrect: 4, total: 4, attemptedIds: [], missedIds: [] });
    recordPracticeAttempt('a', { firstTryCorrect: 2, total: 4, attemptedIds: [], missedIds: [] });
    expect(levelXp(ls, 1).earned).toBeLessThan(lessonPassXp());
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
});
