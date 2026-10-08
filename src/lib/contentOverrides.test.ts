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

import { changedSpan, propagateSpan, swahiliSpans } from './contentOverrides';

describe('app-wide propagation', () => {
  it('finds the smallest changed run of words', () => {
    expect(changedSpan('Aah, sawa. Lete tu.', 'Aah, sawa. Leta tu.')).toEqual({ from: 'Lete', to: 'Leta' });
    expect(changedSpan('Utakunywa chai au soda?', 'Utakunywa chai ama soda?')).toEqual({ from: 'au', to: 'ama' });
    expect(changedSpan('Sawa.', 'Sawa!')).toBeNull();
  });

  it('only Swahili edits propagate, as whole words, in Swahili fields', () => {
    const other = {
      turns: [{ id: 'a', swahili: 'Lete chai. Mletee.', english: 'Bring tea.', options: [{ swahili: 'Lete chai.', correct: true }] }],
      practice: [{ id: 'p', before: '', after: ' tu.', options: [{ text: 'Lete', correct: true }], english: 'Lete it' }],
      vocabulary: [{ id: 'v', swahili: 'Lete tu', english: 'Just bring it', exampleContext: 'lete = bring!' }],
    };
    const scope = { turns: [{ id: 't', swahili: 'Aah, sawa. Lete tu.', english: 'Ah, fine. Just bring it.' }] };
    const spans = swahiliSpans(scope, { find_text: 'Aah, sawa. Lete tu.', replace_text: 'Aah, sawa. Leta tu.' });
    expect(spans).toEqual([{ from: 'Lete', to: 'Leta' }]);
    expect(propagateSpan(other, spans[0])).toBe(5);
    expect(other.turns[0].swahili).toBe('Leta chai. Mletee.'); // Mletee untouched (not a whole-word match)
    expect(other.practice[0].options[0].text).toBe('Leta');
    expect(other.practice[0].english).toBe('Lete it'); // English stays
    expect(other.vocabulary[0].exampleContext).toBe('leta = bring!');
    expect(swahiliSpans(scope, { find_text: 'Ah, fine. Just bring it.', replace_text: 'Ah, fine. Bring it.' })).toEqual([]);
  });
});
