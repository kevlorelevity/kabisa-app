import { beforeEach, describe, it, expect } from 'vitest';
import type { Lesson } from '../types';
import {
  PASS_THRESHOLD,
  getLessonScores,
  isLessonPassed,
  isLessonUnlocked,
  isStruggling,
  recordDialogueAttempt,
  recordDrillMastered,
  recordPracticeAttempt,
} from './lessonScores';

const mk = (id: string, withPractice = true) =>
  ({ id, practice: withPractice ? [{ id: 'p' }] : [] }) as unknown as Lesson;
const L1 = mk('one');
const L2 = mk('two');

const attempt = (ok: number, total: number, missed: string[] = [], attempted?: string[]) => ({
  firstTryCorrect: ok,
  total,
  missedIds: missed,
  attemptedIds: attempted ?? Array.from({ length: total }, (_, i) => `i${i}`),
});

beforeEach(() => localStorage.clear());

describe('lesson gating', () => {
  it('first lesson is always unlocked; the next needs both sections passed', () => {
    expect(isLessonUnlocked([L1, L2], 'one')).toBe(true);
    expect(isLessonUnlocked([L1, L2], 'two')).toBe(false);

    recordDialogueAttempt('one', attempt(4, 4));
    expect(isLessonUnlocked([L1, L2], 'two')).toBe(false); // practice still missing

    recordPracticeAttempt('one', attempt(10, 20));
    expect(isLessonUnlocked([L1, L2], 'two')).toBe(false); // 50% < threshold

    recordPracticeAttempt('one', attempt(18, 20));
    expect(isLessonPassed(L1)).toBe(true);
    expect(isLessonUnlocked([L1, L2], 'two')).toBe(true);
  });

  it('keeps the best score, so a worse retry does not re-lock', () => {
    recordDialogueAttempt('one', attempt(4, 4));
    recordPracticeAttempt('one', attempt(20, 20));
    recordPracticeAttempt('one', attempt(1, 20));
    expect(getLessonScores('one').practice?.best).toBe(1);
    expect(isLessonPassed(L1)).toBe(true);
  });

  it('passes exactly at the threshold', () => {
    recordDialogueAttempt('one', attempt(3, 4));
    expect(3 / 4).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    expect(isLessonPassed(mk('one', false))).toBe(true);
  });
});

describe('weak phrases and struggle detection', () => {
  it('adds missed items and clears ones later answered first-try', () => {
    recordDialogueAttempt('one', attempt(2, 4, ['a', 'b'], ['a', 'b', 'c', 'd']));
    expect(getLessonScores('one').weakTurns).toEqual(['a', 'b']);
    recordDialogueAttempt('one', attempt(3, 4, ['b'], ['a', 'b', 'c', 'd']));
    expect(getLessonScores('one').weakTurns).toEqual(['b']);
  });

  it('drill mastery clears weak items', () => {
    recordPracticeAttempt('one', attempt(1, 3, ['x', 'y'], ['x', 'y', 'z']));
    recordDrillMastered('one', [], ['x']);
    expect(getLessonScores('one').weakPractice).toEqual(['y']);
  });

  it('flags struggling after two failed attempts', () => {
    recordDialogueAttempt('one', attempt(1, 4, ['a']));
    expect(isStruggling(getLessonScores('one'))).toBe(false);
    recordPracticeAttempt('one', attempt(2, 10, ['x']));
    expect(isStruggling(getLessonScores('one'))).toBe(true);
  });
});
