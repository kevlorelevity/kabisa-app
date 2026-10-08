import { describe, expect, it } from 'vitest';
import { normalizeResult, outputSchema, patchScopeFor, buildPrompt } from './aiPatch';
import { applyPatchTo, applyWordEverywhere } from './contentOverrides';
import type { Lesson } from '../types';

const mk = (id: string, words: Array<{ text: string; gloss: string; note?: string }>): Lesson =>
  ({
    id,
    uuid: id,
    title: id,
    category: 'transport',
    difficulty: 'beginner',
    level: 1,
    culturalNote: '',
    startingPoint: '',
    turns: [{ id: `${id}-t1`, speaker: 'Dereva', role: 'auto', swahili: 'Sawa, twende.', english: 'Okay, let’s go.', words }],
    vocabulary: [{ id: `${id}-v1`, swahili: 'sawa', english: 'okay', exampleContext: 'Sawa!' }],
  }) as Lesson;

describe('learner notes (content patches)', () => {
  it('merges a note into a turn and removes it with an empty string', () => {
    const l = mk('a', [{ text: 'Sawa', gloss: 'okay' }]);
    expect(applyPatchTo(l, { scope: 'fields', item_id: 'a-t1', value: { note: 'Also “fine / agreed”.' } })).toBe(true);
    expect(l.turns[0].note).toBe('Also “fine / agreed”.');
    applyPatchTo(l, { scope: 'fields', item_id: 'a-t1', value: { note: '' } });
    expect(l.turns[0].note).toBeUndefined();
  });

  it('merges a note into a flashcard', () => {
    const l = mk('a', []);
    applyPatchTo(l, { scope: 'fields', item_id: 'a-v1', value: { note: 'Kenyans say it all day.', sanifu: '' } });
    expect(l.vocabulary[0].note).toBe('Kenyans say it all day.');
  });

  it('changes one word by index, keeping the text', () => {
    const l = mk('a', [{ text: 'Sawa', gloss: 'okay' }, { text: 'twende', gloss: 'let’s go' }]);
    applyPatchTo(l, { scope: 'word', item_id: 'a-t1', value: { text: 'twende', wordIndex: 1, gloss: 'let’s go (we go)', note: 'Used to hurry people.', sanifu: '' } });
    expect(l.turns[0].words[1]).toEqual({ text: 'twende', gloss: 'let’s go (we go)', note: 'Used to hurry people.' });
    expect(l.turns[0].words[0].note).toBeUndefined();
  });

  it('spreads a word note to every gloss and flashcard of that word', () => {
    const a = mk('a', [{ text: 'Sawa', gloss: 'okay' }]);
    const b = mk('b', [{ text: 'sawa', gloss: 'fine' }]);
    const n = applyWordEverywhere([a, b], { text: 'Sawa', note: 'Also “equal”.', gloss: 'IGNORED' });
    expect(n).toBe(4);
    expect(b.turns[0].words[0]).toEqual({ text: 'sawa', gloss: 'fine', note: 'Also “equal”.' });
    expect(b.vocabulary[0].note).toBe('Also “equal”.');
  });
});

describe('AI on words and flashcards', () => {
  it('maps kinds to patch scopes', () => {
    expect(patchScopeFor('item', 'word')).toBe('word');
    expect(patchScopeFor('item', 'vocab')).toBe('fields');
    expect(patchScopeFor('item', 'turn')).toBe('item');
    expect(patchScopeFor('dialogue', null)).toBe('dialogue');
  });

  it('has schemas for words and cards', () => {
    expect(Object.keys((outputSchema('item', 'word') as { properties: object }).properties)).toContain('word');
    expect(Object.keys((outputSchema('item', 'vocab') as { properties: object }).properties)).toContain('card');
  });

  it('normalises a word result: original text, empty strings clear', () => {
    const current = { word: { text: 'twende', gloss: 'let’s go' }, line: { swahili: 'Sawa, twende.' } };
    const r = normalizeResult('item', 'word', { summary: 'Added a note', word: { text: 'Twende!', gloss: 'let’s go', note: 'Hurry-up word.' } }, current, 't1');
    expect(r.value).toEqual({ text: 'twende', gloss: 'let’s go', sanifu: '', note: 'Hurry-up word.' });
  });

  it('normalises a flashcard result', () => {
    const r = normalizeResult(
      'item',
      'vocab',
      { summary: 's', card: { swahili: 'sawa', english: 'okay', exampleContext: 'Sawa!', note: 'Also “equal”.' } },
      { id: 'v1', swahili: 'sawa', english: 'okay', exampleContext: 'Sawa!' },
      'v1',
    );
    expect(r.value).toMatchObject({ swahili: 'sawa', note: 'Also “equal”.', sanifu: '', sanifuNote: '' });
  });

  it('keeps a turn note from the AI', () => {
    const r = normalizeResult(
      'item',
      'turn',
      { summary: 's', turn: { speaker: 'Dereva', role: 'auto', swahili: 'Sawa.', english: 'Okay.', words: [], note: 'Very common.' } },
      { id: 't1', swahili: 'Sawa.' },
      't1',
    );
    expect((r.value as { note?: string }).note).toBe('Very common.');
  });

  it('describes the word task in the prompt and mentions notes in the rules', () => {
    const { system, user } = buildPrompt({
      scope: 'item',
      kind: 'word',
      instruction: 'add a note',
      targetLabel: 'Word · “twende”',
      lesson: { id: 'a', title: 'A', level: 1 },
      current: {},
      grammar: [],
      guidance: [],
    });
    expect(user).toContain('one word or expression');
    expect(system).toContain('"note"');
  });
});
