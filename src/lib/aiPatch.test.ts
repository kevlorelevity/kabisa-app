import { describe, expect, it } from 'vitest';
import { buildPrompt, normalizeResult, outputSchema, parseClaudeJson } from './aiPatch';
import { applyPatchTo } from './contentOverrides';
import type { Lesson } from '../types';

const current = [
  { id: 't1', speaker: 'Mama', role: 'auto', swahili: 'Karibu!', english: 'Welcome!', words: [{ text: 'Karibu', gloss: 'welcome', grammar: ['greetings'] }] },
  { id: 't2', speaker: 'John', role: 'user', swahili: 'Asante, mama.', english: 'Thanks, ma.', words: [], options: [] },
];

describe('AI edit validation', () => {
  it('keeps known ids, gives new turns fresh ids, and keeps rich glosses for unchanged lines', () => {
    const raw = {
      summary: 'Added a question about family.',
      turns: [
        { id: 't1', speaker: 'Mama', role: 'auto', swahili: 'Karibu!', english: 'Welcome!', words: [] },
        { speaker: 'Mama', role: 'auto', swahili: 'Una watoto?', english: 'Do you have children?', words: [{ text: 'watoto', gloss: 'children' }, { text: 'nope', gloss: 'x' }] },
        { id: 't2', speaker: 'John', role: 'user', swahili: 'Ndiyo, wawili.', english: 'Yes, two.', words: [], options: [{ swahili: 'Ndiyo, wawili.', correct: true }, { swahili: 'Ndiyo, nilikula.', correct: false }, { swahili: 'Ndiyo, wawili.', correct: false }] },
      ],
    };
    const { summary, value } = normalizeResult('dialogue', null, raw, current);
    const turns = value as Array<Record<string, unknown>>;
    expect(summary).toMatch(/family/);
    expect(turns[0].id).toBe('t1');
    expect(turns[0].words).toEqual(current[0].words); // unchanged line keeps compiled glosses
    expect(turns[1].id).not.toBe('t1');
    expect(turns[1].words).toEqual([{ text: 'watoto', gloss: 'children' }]); // gloss not in the line dropped
    expect(turns[2].options).toEqual([
      { swahili: 'Ndiyo, wawili.', correct: true },
      { swahili: 'Ndiyo, nilikula.', correct: false },
    ]);
  });

  it('rejects output a learner could not use', () => {
    expect(() => normalizeResult('dialogue', null, { summary: 'x', turns: [] }, current)).toThrow();
    expect(() =>
      normalizeResult('item', 'turn', { summary: 'x', turn: { speaker: 'John', role: 'user', swahili: 'Sawa', english: 'OK', words: [], options: [] } }, current[1], 't2'),
    ).toThrow(/wrong option/);
  });

  it('forces the item id for single-item edits and adds the Sanifu footnote', () => {
    const { value } = normalizeResult(
      'item',
      'turn',
      { summary: 'Added Sanifu.', turn: { id: 'zzz', speaker: 'John', role: 'user', swahili: 'Jina yangu ni John.', english: 'My name is John.', sanifu: 'Jina langu ni John.', words: [], options: [{ swahili: 'Jina yako ni John.', correct: false }] } },
      current[1],
      't2',
    );
    expect(value).toMatchObject({ id: 't2', sanifu: 'Jina langu ni John.', options: [{ swahili: 'Jina yangu ni John.', correct: true }, { swahili: 'Jina yako ni John.', correct: false }] });
  });

  it('builds a prompt with house rules, allowed grammar and team notes; schema per scope', () => {
    const { system, user } = buildPrompt({
      scope: 'dialogue',
      kind: null,
      instruction: 'More questions about family',
      lesson: { id: 'market', title: 'Market', level: 2 },
      current,
      grammar: [{ slug: 'present-na', level: 1, title: 'Present' }, { slug: 'past-li', level: 6, title: 'Past' }],
      guidance: [{ text: 'Use ama, not au.' }],
    });
    expect(system).toContain('present-na');
    expect(system).not.toContain('past-li');
    expect(system).toContain('Use ama, not au.');
    expect(user).toContain('More questions about family');
    expect(Object.keys((outputSchema('practice', null) as { properties: object }).properties)).toEqual(['summary', 'practice']);
  });

  it('parses the JSON text block and surfaces refusals', () => {
    expect(parseClaudeJson({ content: [{ type: 'text', text: '{"summary":"ok"}' }] })).toEqual({ summary: 'ok' });
    expect(() => parseClaudeJson({ stop_reason: 'refusal', content: [] })).toThrow(/declined/);
  });

  it('applies patches to a lesson', () => {
    const lesson = { turns: structuredClone(current), practice: [{ id: 'p1' }] } as unknown as Lesson;
    applyPatchTo(lesson, { scope: 'item', item_id: 't2', value: { ...current[1], swahili: 'Poa.' } });
    expect(lesson.turns[1].swahili).toBe('Poa.');
    applyPatchTo(lesson, { scope: 'practice', item_id: null, value: [{ id: 'p9' }] });
    expect(lesson.practice?.[0].id).toBe('p9');
  });
});
