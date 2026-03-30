import { describe, it, expect, beforeEach } from 'vitest';
import {
  initialCardState,
  scheduleCard,
  isDue,
  todayString,
} from './srs';
import type { CardState } from './types';

describe('todayString', () => {
  it('returns current date in YYYY-MM-DD format', () => {
    const result = todayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('initialCardState', () => {
  it('returns a card due today with default SM-2 values', () => {
    const state = initialCardState();
    expect(state.interval).toBe(1);
    expect(state.easeFactor).toBe(2.5);
    expect(state.repetitions).toBe(0);
    expect(state.nextReview).toBe(todayString());
  });
});

describe('scheduleCard', () => {
  let baseState: CardState;

  beforeEach(() => {
    baseState = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2026-03-30' };
  });

  it('resets interval and repetitions on forgot', () => {
    const next = scheduleCard(baseState, 'forgot');
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(1);
  });

  it('sets interval to 1 on first easy review', () => {
    const next = scheduleCard(baseState, 'easy');
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
  });

  it('sets interval to 6 on second easy review', () => {
    const after1 = scheduleCard(baseState, 'easy');
    const after2 = scheduleCard(after1, 'easy');
    expect(after2.interval).toBe(6);
    expect(after2.repetitions).toBe(2);
  });

  it('multiplies interval by easeFactor on third+ easy review', () => {
    const s1 = scheduleCard(baseState, 'easy');
    const s2 = scheduleCard(s1, 'easy');
    const s3 = scheduleCard(s2, 'easy');
    expect(s3.interval).toBe(Math.round(6 * s2.easeFactor));
    expect(s3.repetitions).toBe(3);
  });

  it('does not let easeFactor drop below 1.3', () => {
    let state = baseState;
    for (let i = 0; i < 10; i++) {
      state = scheduleCard(state, 'forgot');
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('hard rating does not reset but uses lower quality score', () => {
    const next = scheduleCard(baseState, 'hard');
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBe(1);
  });

  it('nextReview is in the future after a successful review', () => {
    const s1 = scheduleCard(baseState, 'easy');
    const s2 = scheduleCard(s1, 'easy');
    const s3 = scheduleCard(s2, 'easy');
    expect(s3.nextReview > todayString()).toBe(true);
  });
});

describe('isDue', () => {
  it('returns true when nextReview is today', () => {
    const state: CardState = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: todayString() };
    expect(isDue(state)).toBe(true);
  });

  it('returns true when nextReview is in the past', () => {
    const state: CardState = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2020-01-01' };
    expect(isDue(state)).toBe(true);
  });

  it('returns false when nextReview is in the future', () => {
    const state: CardState = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2099-12-31' };
    expect(isDue(state)).toBe(false);
  });
});
