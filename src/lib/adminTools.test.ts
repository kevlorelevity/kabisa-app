import { describe, expect, it } from 'vitest';
import { parsePracticeSentence } from '../components/adminTargets';
import { applyPatchTo } from './contentOverrides';
import { voiceForSpeaker } from './audio';
import { pickKeyWord } from './typing';
import type { Lesson } from '../types';

const lesson = (): Lesson =>
  ({
    id: 'l', uuid: 'l', title: 'L', category: 'social', difficulty: 'beginner', level: 6, culturalNote: 'Mhudumu works here.', startingPoint: '',
    turns: [
      { id: 't1', speaker: 'Mhudumu', role: 'auto', swahili: 'Karibu!', english: 'Welcome!', words: [] },
      { id: 't2', speaker: 'Dereva', role: 'user', swahili: 'Asante, Mhudumu.', english: 'Thanks.', words: [], options: [{ swahili: 'Asante, Mhudumu.', correct: true }] },
    ],
    vocabulary: [{ id: 'v1', swahili: 'karibu', english: 'welcome', exampleContext: '' }],
    practice: [{ id: 'p1', mode: 'translate', english: 'x', before: '', after: '.', options: [{ text: 'a', correct: true }], explanation: '' }],
  }) as Lesson;

describe('admin: practice lines, names & voices, typed word', () => {
  it('reads the [✓right | wrong] sentence format', () => {
    expect(parsePracticeSentence('[✓Ninaenda | Unaenda] Westlands.')).toEqual({ before: '', after: ' Westlands.', options: [{ text: 'Ninaenda', correct: true }, { text: 'Unaenda', correct: false }] });
    expect(parsePracticeSentence('Ninaenda Westlands.')).toBeNull();
    expect(parsePracticeSentence('[Ninaenda | Unaenda]')).toBeNull();
  });

  it('adds and removes practice lines', () => {
    const l = lesson();
    applyPatchTo(l, { scope: 'add', item_id: 'p2', value: { id: 'p2', mode: 'translate', english: 'y', before: '', after: '', options: [], explanation: '' } });
    expect(l.practice!.map((p) => p.id)).toEqual(['p1', 'p2']);
    applyPatchTo(l, { scope: 'remove', item_id: 'p1', value: {} });
    expect(l.practice!.map((p) => p.id)).toEqual(['p2']);
  });

  it('renames a speaker everywhere in the lesson and sets voices', () => {
    const l = lesson();
    applyPatchTo(l, { scope: 'lesson', item_id: null, value: { rename: { from: 'Mhudumu', to: 'Akinyi' } } });
    applyPatchTo(l, { scope: 'lesson', item_id: null, value: { voices: { Akinyi: 'female' } } });
    expect(l.turns[0].speaker).toBe('Akinyi');
    expect(l.turns[1].swahili).toBe('Asante, Akinyi.');
    expect(l.turns[1].options![0].swahili).toBe('Asante, Akinyi.');
    expect(l.culturalNote).toBe('Akinyi works here.');
    expect(voiceForSpeaker('Akinyi', l.voices)).toBe('female');
  });

  it('guesses voices from names and honours the lesson setting', () => {
    expect(voiceForSpeaker('Mama Mboga')).toBe('female');
    expect(voiceForSpeaker('Bi. Kamau')).toBe('female');
    expect(voiceForSpeaker('Kamau')).toBe('male');
    expect(voiceForSpeaker('Kamau', { Kamau: 'female' })).toBe('female');
  });

  it('uses the admin-chosen word to type when it is in the line', () => {
    const turn = { swahili: 'Naomba uweke ya elfu tatu.', words: [], typeWord: 'elfu tatu' };
    expect(pickKeyWord(turn)).toEqual({ text: 'elfu tatu', start: 16 });
    expect(pickKeyWord({ ...turn, typeWord: 'mia' })?.text).not.toBe('mia');
  });
});
