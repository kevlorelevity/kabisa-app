import { describe, expect, it } from 'vitest';
import type { Lesson } from '../types';
import { getRawLessons } from '../hooks/useLessons';
import { DEFAULT_PERSONA, personaFor, personalizeLesson } from './personalize';

const raw = getRawLessons();
const find = (id: string) => raw.find((l) => l.id === id) as Lesson;

describe('personalizeLesson', () => {
  const amani = personaFor('Amani', 'DE');

  it('leaves lessons untouched for the default persona', () => {
    expect(personalizeLesson(find('uber-nairobi-2'), DEFAULT_PERSONA)).toBe(find('uber-nairobi-2'));
  });

  it('uses Swahili names in Swahili fields and English names in English fields', () => {
    const l = personalizeLesson(find('neighbours-greetings'), amani);
    const turn = l.turns.find((t) => t.swahili.startsWith('Ninatoka'))!;
    expect(turn.swahili).toBe('Ninatoka Ujerumani, lakini ninafanya kazi hapa Nairobi.');
    expect(turn.english).toBe("I'm from Germany, but I work here in Nairobi.");
    expect(turn.options?.some((o) => o.swahili.includes('Ujerumani'))).toBe(true);
    const name = l.turns.find((t) => t.swahili.startsWith('Jina yangu'))!;
    expect(name.swahili).toBe('Jina yangu ni Amani. Na wewe?');
    expect(JSON.stringify(l)).not.toMatch(/\b(John|Uganda|Kampala)\b/);
  });

  it('keeps glossed words in sync with their line', () => {
    for (const lesson of raw) {
      const l = personalizeLesson(lesson, personaFor('Wanjiru Grace', 'AE'));
      for (const t of l.turns) {
        let cursor = 0;
        for (const w of t.words) {
          const i = t.swahili.indexOf(w.text, cursor);
          expect(i, `${l.id}: "${w.text}" in "${t.swahili}"`).toBeGreaterThanOrEqual(0);
          cursor = i + w.text.length;
        }
      }
    }
  });

  it('keeps ids stable so scores still match', () => {
    const l = personalizeLesson(find('family-photos'), amani);
    expect(l.turns.map((t) => t.id)).toEqual(find('family-photos').turns.map((t) => t.id));
    expect(JSON.stringify(l)).toContain('Wako Berlin na nyanya yao');
  });
});
