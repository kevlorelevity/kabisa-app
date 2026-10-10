import { describe, expect, it } from 'vitest';
import { applyDecision, buildFollowupPrompt, findCandidates, normalizeFollowup, notePatch, questionFor, type FollowupInput } from './aiFollowup';

const lessons = [
  {
    id: 'fundi',
    title: 'Fundi at home',
    turns: [
      { id: 't1', speaker: 'Fundi', role: 'auto', swahili: 'Nitamaliza baada ya saa moja.', english: "I'll finish in an hour.", words: [{ text: 'saa moja', gloss: 'one hour' }] },
      { id: 't2', speaker: 'You', role: 'user', swahili: 'Sawa.', english: 'OK.' },
    ],
    practice: [{ id: 'p1', mode: 'translate', english: 'Wait an hour', before: 'Subiri ', after: '.', options: [{ text: 'saa moja', correct: true }, { text: 'saa mbili', correct: false }], explanation: 'one hour' }],
    vocabulary: [],
  },
  {
    id: 'plans',
    title: 'Saturday plans',
    turns: [{ id: 't3', speaker: 'Amina', role: 'auto', swahili: 'Saa moja asubuhi. Tuondoke mapema.', english: '7 a.m. Let us leave early.' }],
    practice: [],
    vocabulary: [{ id: 'v1', swahili: 'saa moja asubuhi', english: '7 a.m.', exampleContext: 'Swahili time' }],
  },
];
const span = { from: 'saa moja', to: 'lisaa limoja' };

describe('findCandidates', () => {
  it('finds every other line, practice item and flashcard with the old wording (any case), not the edited one', () => {
    const c = findCandidates(lessons, [span], 't1');
    expect(c.map((x) => x.ref)).toEqual(['fundi#p1', 'plans#t3', 'plans#v1']);
    expect(c[0].kind).toBe('practice');
  });
  it('returns nothing without spans', () => {
    expect(findCandidates(lessons, [], 't1')).toEqual([]);
  });
});

describe('applyDecision', () => {
  it('replaces the span as whole words, keeps case, and applies the AI English and gloss', () => {
    const [, t3] = findCandidates(lessons, [span], 't1');
    const out = applyDecision(t3, [span], { english: 'One hour in the morning.', gloss: '' });
    expect(out.swahili).toBe('Lisaa limoja asubuhi. Tuondoke mapema.');
    expect(out.english).toBe('One hour in the morning.');
    // the snapshot is not touched
    expect(t3.item.swahili).toBe('Saa moja asubuhi. Tuondoke mapema.');
  });
  it('updates the word glosses of a line', () => {
    const c = findCandidates(lessons, [span])[0];
    const out = applyDecision(c, [span], { english: '', gloss: 'one hour (duration)' }) as { words: Array<{ text: string; gloss: string }> };
    expect(out.words[0]).toEqual({ text: 'lisaa limoja', gloss: 'one hour (duration)' });
  });
});

describe('normalizeFollowup', () => {
  it('keeps valid decisions and turns missing ones into questions', () => {
    const c = findCandidates(lessons, [span], 't1');
    const r = normalizeFollowup({ summary: 'ok', note: 'n', decisions: [{ ref: 'fundi#p1', action: 'apply', reason: 'duration', english: '', gloss: '' }, { ref: 'plans#t3', action: 'skip', reason: 'time of day', english: '', gloss: '' }] }, c);
    expect(r.decisions.map((d) => d.action)).toEqual(['apply', 'skip', 'ask']);
    expect(r.note).toBe('n');
  });
});

describe('questionFor', () => {
  it('shows the learner-facing Swahili before and after', () => {
    const c = findCandidates(lessons, [span], 't1')[0];
    const q = questionFor(c, { ref: c.ref, action: 'ask', reason: 'Duration here?', english: '', gloss: '' }, [span]);
    expect(q.before).toBe('Subiri [saa moja].');
    expect(q.after).toBe('Subiri [lisaa limoja].');
    expect((q.value.options as Array<{ text: string }>)[0].text).toBe('lisaa limoja');
  });
});

describe('notePatch / prompt', () => {
  const input: FollowupInput = {
    lessonId: 'fundi',
    lessonTitle: 'Fundi at home',
    itemId: 't1',
    itemKind: 'turn',
    changes: [{ label: 'Swahili', lang: 'sw', before: 'Nitamaliza baada ya saa moja.', after: 'Nitamaliza baada ya lisaa limoja.' }],
    context: 'saa moja = 7 a.m.; lisaa limoja = one hour',
    spans: [span],
    makeNote: true,
    candidates: [],
  };
  it('stores a note on the line, or on the word for word edits', () => {
    expect(notePatch(input, 'Keep them apart.')).toEqual({ scope: 'fields', value: { note: 'Keep them apart.' } });
    expect(notePatch({ ...input, itemKind: 'word', wordText: 'lisaa limoja', wordIndex: 3 }, 'x')).toEqual({ scope: 'word', value: { text: 'lisaa limoja', wordIndex: 3, note: 'x' } });
    expect(notePatch(input, '')).toBeNull();
  });
  it('puts the context and every place in the prompt', () => {
    const c = findCandidates(lessons, [span], 't1');
    const { system, user } = buildFollowupPrompt(input, c, true, [{ text: 'Use ama, not au.' }]);
    expect(system).toContain('Use ama, not au.');
    expect(system).toContain('Learner note');
    expect(user).toContain("Editor's context note: saa moja = 7 a.m.");
    expect(user).toContain('[plans#t3]');
    expect(user).toContain('after change:  Lisaa limoja asubuhi.');
  });
});
