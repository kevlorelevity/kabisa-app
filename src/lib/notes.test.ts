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

describe('AI edits that leave answer choices out', () => {
  it('keeps the existing wrong options of a learner line', () => {
    const current = {
      id: 't9',
      speaker: 'Mgeni',
      role: 'user',
      swahili: 'Ndiyo. Ninaishi hapa, nyumba namba tano.',
      english: 'Yes. I live here, house number five.',
      words: [],
      options: [
        { swahili: 'Ndiyo. Ninaishi hapa, nyumba namba tano.', correct: true },
        { swahili: 'Ndiyo. Ninakula hapa, nyumba namba tano.', correct: false },
        { swahili: 'Ndiyo. Ninaishi Kampala.', correct: false },
      ],
    };
    const r = normalizeResult(
      'item',
      'turn',
      { summary: 'Added Sanifu', turn: { speaker: 'Mgeni', role: 'user', swahili: current.swahili, english: current.english, words: [], sanifu: 'Ndiyo. Ninaishi hapa, nyumba nambari tano.' } },
      current,
      't9',
    );
    const v = r.value as { options: Array<{ swahili: string; correct: boolean }>; sanifu: string };
    expect(v.sanifu).toContain('nambari');
    expect(v.options).toHaveLength(3);
    expect(v.options.filter((o) => o.correct)).toHaveLength(1);
  });
});

import { realignWords } from './contentOverrides';

describe('realigning underlined words after an edit', () => {
  const line = 'Sawa. Mimi ninatoa taka, halafu ninapika chakula cha mchana.';
  const words = () => [
    { text: 'Sawa', gloss: 'okay' },
    { text: 'ninatoa', gloss: 'I take out' },
    { text: 'taka', gloss: 'rubbish' },
    { text: 'halafu', gloss: 'then' },
    { text: 'chakula cha mchana', gloss: 'lunch' },
  ];

  it('stretches a gloss over a word typed right next to it', () => {
    const turn = { swahili: 'Sawa. Mimi ninatoa taka taka, halafu ninapika chakula cha mchana.', words: words() };
    realignWords(turn, line);
    expect(turn.words.map((w) => w.text)).toEqual(['Sawa', 'ninatoa', 'taka taka', 'halafu', 'chakula cha mchana']);
  });

  it('drops glosses for removed words and keeps the rest in place', () => {
    const turn = {
      swahili: 'Sawa. Mimi ninafagia sakafu.',
      words: [
        { text: 'Sawa', gloss: 'okay' },
        { text: 'ninafagia', gloss: 'I sweep' },
        { text: 'sakafu', gloss: 'floor' },
        { text: 'kupiga deki', gloss: 'to mop' },
      ],
    };
    realignWords(turn, 'Sawa. Mimi ninafagia sakafu na kupiga deki.');
    expect(turn.words.map((w) => w.text)).toEqual(['Sawa', 'ninafagia', 'sakafu']);
  });

  it('drops a gloss when its word was replaced', () => {
    const turn = { swahili: 'Sawa. Mimi ninatoa nguo, halafu ninapika chakula cha mchana.', words: words() };
    realignWords(turn, line);
    expect(turn.words.map((w) => w.text)).toEqual(['Sawa', 'ninatoa', 'halafu', 'chakula cha mchana']);
  });
});

describe('AI re-gloss after an admin edit', () => {
  it('keeps the edited line and choices, takes the fresh glosses', () => {
    const current = {
      id: 't1',
      speaker: 'Otieno',
      role: 'user',
      swahili: 'Ninatoa taka taka.',
      english: 'I take out the rubbish.',
      words: [{ text: 'Ninatoa', gloss: 'I take out', grammar: ['present-na'] }, { text: 'taka taka', gloss: 'rubbish' }],
      options: [
        { swahili: 'Ninatoa taka taka.', correct: true },
        { swahili: 'Ninapika taka taka.', correct: false },
      ],
    };
    const r = normalizeResult(
      'item',
      'turn',
      {
        summary: 'Reglossed',
        turn: {
          speaker: 'X',
          role: 'auto',
          swahili: 'Changed!',
          english: 'I take out the garbage.',
          words: [
            { text: 'Ninatoa', gloss: 'I am taking out' },
            { text: 'taka taka', gloss: 'rubbish / garbage (Kenyans double it)', sanifu: 'taka' },
          ],
        },
      },
      current,
      't1',
      { regloss: true },
    );
    const v = r.value as typeof current & { words: Array<Record<string, unknown>> };
    expect(v.swahili).toBe('Ninatoa taka taka.');
    expect(v.role).toBe('user');
    expect(v.options[1].swahili).toBe('Ninapika taka taka.');
    expect(v.words[1]).toMatchObject({ text: 'taka taka', sanifu: 'taka' });
    expect(v.words[0]).toMatchObject({ gloss: 'I am taking out', grammar: ['present-na'] });
  });
});

describe('notes the AI puts on a word inside a line', () => {
  const turn = () => ({
    id: 't1',
    speaker: 'Otieno',
    role: 'auto',
    swahili: 'Ninapika chakula cha mchana.',
    english: 'I am cooking lunch.',
    words: [
      { text: 'Ninapika', gloss: 'I am cooking', grammar: ['present-na'] },
      { text: 'chakula cha mchana', gloss: 'lunch' },
    ],
  });

  it('keeps them when the line itself did not change', () => {
    const r = normalizeResult(
      'item',
      'turn',
      {
        summary: 'Added a note',
        turn: {
          ...turn(),
          words: [
            { text: 'Ninapika', gloss: 'cooking' },
            { text: 'chakula cha mchana', gloss: 'lunch', note: 'Often shortened to “chamcha”, or just “lunch”.' },
          ],
        },
      },
      turn(),
      't1',
    );
    const v = r.value as ReturnType<typeof turn> & { words: Array<Record<string, unknown>> };
    expect(v.words[0]).toEqual({ text: 'Ninapika', gloss: 'I am cooking', grammar: ['present-na'] });
    expect(v.words[1].note).toContain('chamcha');
  });

  it('a turn snapshot keeps the lesson’s newer glosses and adds its notes', () => {
    const lesson = { turns: [{ ...turn(), words: [{ text: 'Ninapika', gloss: 'newer gloss' }, { text: 'chakula cha mchana', gloss: 'lunch (midday food)' }] }] } as unknown as Lesson;
    const snap = { ...turn(), words: [{ text: 'Ninapika', gloss: 'old' }, { text: 'chakula cha mchana', gloss: 'old', note: 'chamcha!' }] };
    applyPatchTo(lesson, { scope: 'item', item_id: 't1', value: snap });
    expect(lesson.turns[0].words.map((w) => w.gloss)).toEqual(['newer gloss', 'lunch (midday food)']);
    expect(lesson.turns[0].words[1].note).toBe('chamcha!');
  });

  it('a re-gloss brings its own glosses', () => {
    const lesson = { turns: [turn()] } as unknown as Lesson;
    applyPatchTo(lesson, { scope: 'item', item_id: 't1', value: { ...turn(), wordsFresh: true, words: [{ text: 'Ninapika', gloss: 'fresh' }] } });
    expect(lesson.turns[0].words).toEqual([{ text: 'Ninapika', gloss: 'fresh' }]);
    expect('wordsFresh' in lesson.turns[0]).toBe(false);
  });
});

import { wordSwaps, swahiliOf } from './aiPatch';

describe('word swaps from AI edits', () => {
  it('finds single-word swaps', () => {
    expect(wordSwaps('Unaenda mbele kidogo hadi dukani.', 'Unaenda mbele kidogo mpaka dukani.')).toEqual([{ from: 'hadi', to: 'mpaka' }]);
  });
  it('finds several swaps but ignores pure deletions', () => {
    expect(wordSwaps('Samahani, hospitali ya wilaya iko wapi?', 'Pole, hospitali iko wapi?')).toEqual([{ from: 'Samahani', to: 'Pole' }]);
  });
  it('ignores the learner placeholders and big rewrites', () => {
    expect(wordSwaps('Ninatoka Uganda.', 'Ninatoka Germany.')).toEqual([]);
    expect(wordSwaps('A b c d e.', 'V w x y z.')).toEqual([]);
  });
  it('reads practice items', () => {
    expect(swahiliOf({ before: 'Ninaenda ', after: ' sokoni.', options: [{ text: 'hadi', correct: true }] })).toBe('Ninaenda hadi sokoni.');
  });
});

import { propagateSpan } from './contentOverrides';

describe('swaps leave explanatory notes alone', () => {
  it('replaces in Swahili but not in a note that already names the new word', () => {
    const l = {
      turns: [
        {
          swahili: 'Unaenda hadi sokoni.',
          words: [{ text: 'hadi', gloss: 'up to, until', note: 'Kenyans say mpaka far more often than hadi.' }],
        },
      ],
    };
    propagateSpan(l, { from: 'hadi', to: 'mpaka' });
    expect(l.turns[0].swahili).toBe('Unaenda mpaka sokoni.');
    expect(l.turns[0].words[0].text).toBe('mpaka');
    expect(l.turns[0].words[0].note).toBe('Kenyans say mpaka far more often than hadi.');
  });
});

describe('a word typed into a line with its meaning', () => {
  it('is underlined in its place', async () => {
    const { applyPatchTo } = await import('./contentOverrides');
    const lesson = {
      id: 'l',
      title: 'L',
      turns: [{ id: 't1', speaker: 'Fundi', role: 'auto', swahili: 'Nitamaliza baada ya lisaa limoja.', english: '', words: [{ text: 'Nitamaliza', gloss: 'I will finish' }, { text: 'baada ya', gloss: 'after' }] }],
      vocabulary: [],
    } as never;
    expect(applyPatchTo(lesson, { scope: 'word', item_id: 't1', value: { text: 'lisaa limoja', gloss: 'one hour' } })).toBe(true);
    expect((lesson as { turns: Array<{ words: Array<{ text: string }> }> }).turns[0].words.map((w) => w.text)).toEqual(['Nitamaliza', 'baada ya', 'lisaa limoja']);
  });
});
