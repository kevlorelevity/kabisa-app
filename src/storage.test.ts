import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModuleProgress,
  setModuleProgress,
  getSRSCard,
  setSRSCard,
  getAllSRSCards,
} from './storage';
import type { ModuleProgress, CardState } from './types';

beforeEach(() => {
  localStorage.clear();
});

describe('module progress', () => {
  it('returns null for an unknown module', () => {
    expect(getModuleProgress('unknown')).toBeNull();
  });

  it('saves and retrieves module progress', () => {
    const progress: ModuleProgress = {
      status: 'in-progress',
      addedToReview: false,
      lastReviewed: null,
    };
    setModuleProgress('matatu-nairobi', progress);
    expect(getModuleProgress('matatu-nairobi')).toEqual(progress);
  });

  it('updates progress without affecting other modules', () => {
    setModuleProgress('matatu-nairobi', { status: 'in-progress', addedToReview: false, lastReviewed: null });
    setModuleProgress('chai-kiosk', { status: 'reviewed', addedToReview: true, lastReviewed: '2026-03-30' });
    expect(getModuleProgress('matatu-nairobi')?.status).toBe('in-progress');
    expect(getModuleProgress('chai-kiosk')?.status).toBe('reviewed');
  });
});

describe('SRS cards', () => {
  it('returns null for an unknown card', () => {
    expect(getSRSCard('matatu-nairobi:0')).toBeNull();
  });

  it('saves and retrieves an SRS card', () => {
    const card: CardState = { interval: 4, easeFactor: 2.5, repetitions: 2, nextReview: '2026-04-03' };
    setSRSCard('matatu-nairobi:0', card);
    expect(getSRSCard('matatu-nairobi:0')).toEqual(card);
  });

  it('getAllSRSCards returns all stored cards', () => {
    const c1: CardState = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2026-03-30' };
    const c2: CardState = { interval: 6, easeFactor: 2.4, repetitions: 2, nextReview: '2026-04-05' };
    setSRSCard('matatu-nairobi:0', c1);
    setSRSCard('matatu-nairobi:1', c2);
    const all = getAllSRSCards();
    expect(all['matatu-nairobi:0']).toEqual(c1);
    expect(all['matatu-nairobi:1']).toEqual(c2);
  });

  it('getAllSRSCards returns empty object when nothing stored', () => {
    expect(getAllSRSCards()).toEqual({});
  });
});
