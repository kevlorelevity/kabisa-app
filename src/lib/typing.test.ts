import { describe, expect, it } from 'vitest';
import { checkAnswer, pickKeyWord, typingModeFor } from './typing';

describe('typed answers', () => {
  it('starts at level 5: partial for 5–7, complete from 8', () => {
    expect(typingModeFor(4)).toBeUndefined();
    expect(typingModeFor(5)).toBe('partial');
    expect(typingModeFor(7)).toBe('partial');
    expect(typingModeFor(8)).toBe('complete');
  });

  it('forgives case, punctuation and a small typo; accepts Sanifu', () => {
    expect(checkAnswer('nitaenda tao', ['Nitaenda tao!']).verdict).toBe('exact');
    expect(checkAnswer('Nitenda tao', ['Nitaenda tao!']).verdict).toBe('close');
    expect(checkAnswer('Nilienda tao', ['Nitaenda tao!']).verdict).toBe('wrong');
    expect(checkAnswer('jina langu ni John', ['Jina yangu ni John.', 'Jina langu ni John.']).verdict).toBe('exact');
    expect(checkAnswer('sina', ['Nina']).verdict).toBe('wrong'); // short words: no typo allowance
  });

  it('blanks a verb first', () => {
    const turn = {
      swahili: 'Kesho nitaenda sokoni.',
      words: [
        { text: 'Kesho', gloss: 'tomorrow' },
        { text: 'nitaenda', gloss: 'I will go', conjugation: { verb: 'enda', tense: 'Future', rows: [] } },
      ],
    };
    expect(pickKeyWord(turn)).toEqual({ text: 'nitaenda', start: 6 });
  });
});
