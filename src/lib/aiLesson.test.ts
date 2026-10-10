import { describe, expect, it } from 'vitest';
import { buildLessonPrompt, lessonSchema, normalizeLesson, type NewLessonInput } from './aiLesson';

const input: NewLessonInput = {
  level: 1,
  levelName: 'Jambo Tourist',
  levelFocus: 'Greetings',
  order: 105,
  prompt: 'Buying airtime at a kiosk',
  existing: [{ title: 'Taking an Uber', theme: 'uber', vocabulary: ['Niaje', 'Poa'] }],
};

const user = (sw: string, en: string) => ({ speaker: 'Wewe', role: 'user', swahili: sw, english: en, words: [{ text: sw.split(' ')[0], gloss: 'x' }], options: [{ swahili: sw, correct: true }, { swahili: `${sw} sana`, correct: false }] });
const auto = (sw: string, en: string) => ({ speaker: 'Mama', role: 'auto', swahili: sw, english: en, words: [] });
const raw = {
  summary: 'Airtime at the kiosk.',
  title: 'Buying Airtime',
  theme: 'Market',
  category: 'commerce',
  culturalNote: 'Kiosks sell airtime.',
  startingPoint: 'You walk up to a kiosk.',
  grammarFocus: ['present-na', 'made-up'],
  turns: [user('Niaje mama', 'Hi'), auto('Poa, karibu', 'Fine, welcome'), user('Nataka credo', 'I want airtime'), auto('Ngapi?', 'How much?'), user('Mia moja', '100'), auto('Sawa', 'OK')],
  practice: [1, 2, 3].map((i) => ({ mode: 'translate', english: `e${i}`, before: '', after: ' credo.', options: [{ text: 'Nataka', correct: true }, { text: 'Unataka', correct: false }], explanation: 'x' })),
  vocabulary: [
    { swahili: 'credo', english: 'airtime', exampleContext: 'Kenyan word', partOfSpeech: 'noun', nounForms: { one: 'credo', many: '' }, englishForms: { one: 'airtime', many: '' } },
    { swahili: 'Nataka', english: 'I want', exampleContext: '', partOfSpeech: 'verb', nounForms: { one: 'x', many: 'y' } },
    { swahili: 'Ngapi?', english: 'How much?', exampleContext: '', partOfSpeech: 'phrase' },
    { swahili: 'mia moja', english: 'one hundred', exampleContext: '', partOfSpeech: 'phrase' },
  ],
};

describe('AI-written lessons', () => {
  it('turns Claude’s answer into a lesson at the end of the level', () => {
    const { lesson, summary } = normalizeLesson(raw, input, new Set(['present-na']));
    expect(summary).toBe('Airtime at the kiosk.');
    expect(lesson).toMatchObject({ title: 'Buying Airtime', level: 1, order: 105, theme: 'market', category: 'commerce', difficulty: 'beginner', grammarFocus: ['present-na'] });
    expect(String(lesson.id)).toMatch(/^buying-airtime-/);
    const vocab = lesson.vocabulary as Array<Record<string, unknown>>;
    expect(vocab[0]).toMatchObject({ nounForms: { one: 'credo', many: null }, englishForms: { one: 'airtime', many: null } });
    expect(vocab[1].nounForms).toBeUndefined(); // only nouns carry forms
    expect((lesson.turns as unknown[]).length).toBe(6);
    expect((lesson.practice as unknown[]).length).toBe(3);
  });

  it('rejects a lesson that is too thin', () => {
    expect(() => normalizeLesson({ ...raw, turns: raw.turns.slice(0, 2) }, input, new Set())).toThrow(/too short/);
  });

  it('tells Claude the level, its existing lessons and the request', () => {
    const { system, user: u } = buildLessonPrompt(input, [{ slug: 'present-na', level: 1, title: 'Present' }, { slug: 'past-li', level: 6, title: 'Past' }], [{ text: 'Use ama, not au' }]);
    expect(system).toContain('present-na');
    expect(system).not.toContain('past-li');
    expect(system).toContain('Use ama, not au');
    expect(u).toContain('Taking an Uber');
    expect(u).toContain("Editor's request: Buying airtime at a kiosk");
    expect(JSON.stringify(lessonSchema())).toContain('englishForms');
  });
});
