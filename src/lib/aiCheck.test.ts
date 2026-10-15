import { describe, expect, it } from 'vitest';
import { buildCheckPrompt, creditFor, fmtScore, normalizeCheck, partialNote, salientForTurn } from './aiCheck';

describe('creditFor', () => {
  it('gives full points when every key item is used', () => {
    expect(creditFor('correct', ['nimefika', 'Sarit'], ['nimefika', 'Sarit'])).toBe(1);
  });
  it('gives part points for a good answer in other words', () => {
    expect(creditFor('correct', ['nimefika', 'Sarit'], [])).toBe(0.5);
    expect(creditFor('correct', ['nimefika', 'Sarit'], ['Sarit'])).toBe(0.75);
    expect(creditFor('correct', ['a', 'b', 'c'], ['a'])).toBe(0.5);
  });
  it('gives full points when the line has no key items', () => {
    expect(creditFor('correct', [], [])).toBe(1);
  });
  it('gives nothing for almost / wrong', () => {
    expect(creditFor('almost', ['x'], ['x'])).toBe(0);
    expect(creditFor('wrong', ['x'], ['x'])).toBe(0);
  });
});

describe('normalizeCheck', () => {
  it('reads Claude output and lists the missing key words', () => {
    const r = normalizeCheck(
      { verdict: 'correct', feedback: 'Nice!', corrected: '', used: [{ item: '“nimefika”', used: false }, { item: 'Sarit', used: true }] },
      ['nimefika', 'Sarit'],
    );
    expect(r).toMatchObject({ verdict: 'correct', credit: 0.75, missing: ['nimefika'], corrected: undefined });
  });
  it('keeps the correction only for almost', () => {
    const r = normalizeCheck({ verdict: 'almost', feedback: 'Use ni-.', corrected: 'Ninaenda Westlands', used: [] }, []);
    expect(r).toMatchObject({ verdict: 'almost', credit: 0, corrected: 'Ninaenda Westlands', missing: [] });
  });
  it('treats junk as wrong', () => {
    expect(normalizeCheck(null, ['x']).verdict).toBe('wrong');
  });
});

describe('salientForTurn', () => {
  const turn = {
    swahili: 'Nimefika karibu na Sarit, boss.',
    words: [
      { text: 'Nimefika', gloss: 'I have arrived', conjugation: { verb: 'kufika' } },
      { text: 'karibu na', gloss: 'near', grammar: ['locatives'] },
      { text: 'boss', gloss: 'boss' },
    ],
  } as never;
  it('starts with the key word, then focus grammar, then verbs', () => {
    expect(salientForTurn(turn, 'Nimefika', ['locatives'])).toEqual(['Nimefika', 'karibu na']);
  });
  it('falls back to the longest word', () => {
    expect(salientForTurn({ swahili: 'Sawa kabisa', words: [] } as never, null)).toEqual(['kabisa']);
  });
});

it('builds a prompt with the key items and the typed line', () => {
  const p = buildCheckPrompt({ english: 'I am going to Westlands', expected: ['Naenda Westlands'], typed: 'Ninaelekea Westlands', salient: ['Naenda'] });
  expect(p).toContain('Key items: “Naenda”');
  expect(p).toContain('Learner typed: Ninaelekea Westlands');
});

it('formats part points', () => {
  expect(fmtScore(7.5)).toBe('7.5');
  expect(fmtScore(8)).toBe('8');
  expect(partialNote(0.5, ['naenda'])).toBe('½ point — use “naenda” from the lesson for the full point.');
});
