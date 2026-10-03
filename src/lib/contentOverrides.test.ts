import { describe, expect, it } from 'vitest';
import { applyOverrideTo, replaceLeaves, resolveOverride } from './contentOverrides';
import { DEFAULT_PERSONA, personaFor } from './personalize';

const lesson = () => ({
  id: 'uber',
  title: 'Taking an Uber',
  turns: [
    { id: 't1', swahili: 'Sawa.', english: 'Okay.' },
    { id: 't2', swahili: 'Ninatoka Uganda.', english: 'I am from Uganda.', options: [{ text: 'Ninatoka Uganda.', correct: true }] },
    { id: 't3', swahili: 'Sawa.', english: 'Fine.' },
  ],
  vocabulary: [{ id: 'v1', swahili: 'poa', english: 'cool', exampleContext: 'Niko poa' }],
});

describe('contentOverrides', () => {
  it('replaces exact leaves but never ids', () => {
    const l = lesson();
    expect(replaceLeaves(l, 'uber', 'x')).toBe(0);
    expect(replaceLeaves(l, 'Taking an Uber', 'Riding an Uber')).toBe(1);
    expect(l.title).toBe('Riding an Uber');
  });

  it('prefers the item it was made on', () => {
    const l = lesson();
    applyOverrideTo(l, { item_id: 't3', find_text: 'Sawa.', replace_text: 'Sawa sawa.' });
    expect(l.turns[0].swahili).toBe('Sawa.');
    expect(l.turns[2].swahili).toBe('Sawa sawa.');
  });

  it('applies changed parts of a joined multi-field text', () => {
    const l = lesson();
    const n = applyOverrideTo(l, { item_id: 'v1', find_text: 'poa | cool | Niko poa', replace_text: 'poa | fine, cool | Niko poa' });
    expect(n).toBe(1);
    expect(l.vocabulary[0].english).toBe('fine, cool');
  });

  it('maps what a personalised learner saw back to the raw script', () => {
    const p = personaFor('Amani', 'DE');
    const o = resolveOverride(
      { type: 'lesson', id: 'uber', content: lesson() },
      't2',
      `Ninatoka ${p.countrySw}.`,
      `Mimi ni wa ${p.countrySw}.`,
      p,
    );
    expect(o).toMatchObject({ scope_id: 'uber', find_text: 'Ninatoka Uganda.', replace_text: 'Mimi ni wa Uganda.' });
  });

  it('returns null when the text cannot be found or did not change', () => {
    const scope = { type: 'lesson' as const, id: 'uber', content: lesson() };
    expect(resolveOverride(scope, undefined, 'Nothing like this', 'New', DEFAULT_PERSONA)).toBeNull();
    expect(resolveOverride(scope, 't1', 'Sawa.', 'Sawa.', DEFAULT_PERSONA)).toBeNull();
    expect(resolveOverride(null, 't1', 'Sawa.', 'Poa.', DEFAULT_PERSONA)).toBeNull();
  });
});
