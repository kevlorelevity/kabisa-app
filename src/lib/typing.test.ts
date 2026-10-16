import { describe, expect, it } from 'vitest';
import { acceptedAnswers, affirmation, checkAnswer, formatAccepted, parseAccepted, pickKeyWord, typingModeFor } from './typing';

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

describe('more than one right answer', () => {
  const line = 'Sawa. Naomba umwambie anipigie simu akifika.';
  const span = { start: line.indexOf('umwambie'), end: line.indexOf('umwambie') + 'umwambie'.length };
  const alts = [{ text: 'mwambie', note: 'Mwambie is the direct command; umwambie is more polite and very common.' }];

  it('word alternatives work when typing the word and when typing the whole line', () => {
    expect(acceptedAnswers({ line, span, mode: 'partial', alts }).map((a) => a.text)).toEqual(['umwambie', 'mwambie']);
    expect(acceptedAnswers({ line, span, mode: 'complete', alts }).map((a) => a.text)).toEqual([
      line,
      'Sawa. Naomba mwambie anipigie simu akifika.',
    ]);
  });

  it('whole-line alternatives give the word that changes at the gap', () => {
    const whole = [{ text: 'Sawa. Naomba mwambie anipigie simu akifika.' }, { text: 'Haya. Mwambie anipigie.' }];
    expect(acceptedAnswers({ line, span, mode: 'partial', alts: whole }).map((a) => a.text)).toEqual(['umwambie', 'mwambie']);
  });

  it('says which one the learner chose and why both work', () => {
    const answers = acceptedAnswers({ line, span, mode: 'partial', alts });
    const r = checkAnswer('Mwambie', answers);
    expect(r).toMatchObject({ verdict: 'exact', index: 1 });
    expect(affirmation('Mwambie', answers, r.index)).toBe(
      'You chose “mwambie”! Good — both “mwambie” and “umwambie” work. Mwambie is the direct command; umwambie is more polite and very common.',
    );
    expect(affirmation('umwambie', answers, 0)).toMatch(/^You chose “umwambie”! Good — both “umwambie” and “mwambie” work\./);
    expect(affirmation('nitaenda', [{ text: 'nitaenda' }], 0)).toBeNull();
  });

  it('accepts everyday variants (naenda = ninaenda, ndio = ndiyo, au = ama) and explains them', () => {
    expect(checkAnswer('Ndio, naenda tao.', ['Ndiyo, ninaenda tao.']).verdict).toBe('exact');
    expect(checkAnswer('chai au soda', ['chai ama soda']).verdict).toBe('exact');
    expect(affirmation('naenda', [{ text: 'ninaenda' }], 0)).toMatch(/short form of nina-/);
    expect(checkAnswer('sina', ['Nina']).verdict).toBe('wrong');
  });

  it('admin text ⇄ list', () => {
    const t = 'mwambie | direct command\nNaomba umwambie anipigie simu.';
    expect(parseAccepted(t)).toEqual([{ text: 'mwambie', note: 'direct command' }, { text: 'Naomba umwambie anipigie simu.' }]);
    expect(formatAccepted(parseAccepted(t))).toBe(t.replace('mwambie | direct', 'mwambie | direct'));
  });
});

describe('more forgiving typing (Oct 16)', () => {
  it('accepts interchangeable phrases from the seed spreadsheet', () => {
    expect(checkAnswer('Tutakujulisha uamuzi wetu wiki kesho', ['Tutakujulisha uamuzi wetu wiki ijayo.']).verdict).toBe('exact');
    expect(checkAnswer('nitakusubiri hadi saa nne', ['Nitakungoja mpaka saa nne.']).verdict).toBe('exact');
  });
  it('a gap inside "wiki ijayo" also takes "kesho"', () => {
    const line = 'Tutakujulisha uamuzi wetu wiki ijayo.';
    const start = line.indexOf('ijayo');
    const acc = acceptedAnswers({ line, span: { start, end: start + 5 }, mode: 'partial' });
    expect(checkAnswer('kesho', acc).verdict).toBe('exact');
  });
  it('forgives a slip in each word, but never in the grammar at the front', () => {
    expect(checkAnswer('Tutakujulsha uamzi wetu', ['Tutakujulisha uamuzi wetu']).verdict).toBe('close');
    expect(checkAnswer('pole pole', ['polepole']).verdict).toBe('close');
    expect(checkAnswer('saana', ['sana']).verdict).toBe('close');
    expect(checkAnswer('Nilienda tao', ['Nitaenda tao!']).verdict).toBe('wrong');
    expect(checkAnswer('sina', ['Nina']).verdict).toBe('wrong');
    expect(checkAnswer('Hatuendi', ['Tunaenda']).verdict).toBe('wrong');
  });
});
