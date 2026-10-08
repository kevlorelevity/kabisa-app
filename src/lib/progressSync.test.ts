import { describe, it, expect } from 'vitest';
import { mergeRecords, mergeStores } from './progressSync';

const sec = (best: number, last: number, attempts: number, failed = 0) => ({ best, last, attempts, failed });

describe('progress sync merge', () => {
  it('keeps the best score and the most-played copy’s latest result and weak items', () => {
    const device = { dialogue: sec(0.9, 0.9, 2), weakTurns: ['a'], weakPractice: [] };
    const server = { dialogue: sec(0.6, 0.6, 3, 1), practice: sec(0.8, 0.8, 1), weakTurns: ['b'], weakPractice: ['p'] };
    const m = mergeRecords(device, server);
    expect(m.dialogue).toEqual({ best: 0.9, last: 0.6, attempts: 3, failed: 1 });
    expect(m.practice).toEqual(sec(0.8, 0.8, 1));
    expect(m.weakTurns).toEqual(['b']);
    expect(m.weakPractice).toEqual(['p']);
  });

  it('unions lessons from both sides', () => {
    const r = { weakTurns: [], weakPractice: [] };
    expect(Object.keys(mergeStores({ one: r }, { two: r })).sort()).toEqual(['one', 'two']);
  });
});
