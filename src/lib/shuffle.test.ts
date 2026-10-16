import { describe, expect, it } from 'vitest';
import { resetShuffleMemory, shuffleChoices } from './shuffle';

const opts = [
  { t: 'right', correct: true },
  { t: 'wrong 1', correct: false },
  { t: 'wrong 2', correct: false },
];

describe('shuffleChoices', () => {
  it('never shows the right answer in the same spot twice in a row', () => {
    resetShuffleMemory();
    let last = -1;
    for (let i = 0; i < 200; i++) {
      const spot = shuffleChoices('q1', opts, (o) => o.correct).findIndex((o) => o.correct);
      expect(spot).not.toBe(last);
      last = spot;
    }
  });

  it('first showing moves the answer off its authored spot, and keeps every option', () => {
    resetShuffleMemory();
    for (let i = 0; i < 50; i++) {
      resetShuffleMemory();
      const out = shuffleChoices('q2', opts, (o) => o.correct);
      expect(out.findIndex((o) => o.correct)).not.toBe(0);
      expect(out.map((o) => o.t).sort()).toEqual(opts.map((o) => o.t).sort());
    }
  });
});
