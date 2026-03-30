import type { CardState, Rating } from './types';

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function initialCardState(): CardState {
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: todayString(),
  };
}

export function scheduleCard(state: CardState, rating: Rating): CardState {
  const q = rating === 'easy' ? 5 : rating === 'hard' ? 3 : 0;

  let { interval, easeFactor, repetitions } = state;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    );
  }

  return {
    interval,
    easeFactor,
    repetitions,
    nextReview: addDays(todayString(), interval),
  };
}

export function isDue(state: CardState): boolean {
  return state.nextReview <= todayString();
}
