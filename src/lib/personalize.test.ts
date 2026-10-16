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

describe('addressing a woman', () => {
  const her = personaFor('Amani', 'DE', 'female');
  const him = personaFor('Amani', 'DE', 'male');

  it('the other speakers say mama / dada / sista instead of boss / bwana', () => {
    const matatu = personalizeLesson(find('matatu-to-town'), her);
    expect(matatu.turns[0].swahili).toBe('Tao! Tao! Kencom! Panda, sista!');
    expect(matatu.turns[0].english).toBe('Town! Town! Kencom! Get in, sis!');
    const shop = personalizeLesson(find('clothes-colours'), her);
    expect(shop.turns[0].swahili).toBe('Karibu, mama! Unatafuta nini leo?');
    expect(shop.turns[0].english).toBe('Welcome, madam! What are you looking for today?');
    expect(shop.turns[0].words.find((w) => w.text === 'mama')?.gloss).toMatch(/woman/);
    const uber = personalizeLesson(find('uber-nairobi'), her);
    expect(uber.turns.find((t) => t.role === 'auto' && t.swahili.startsWith('Ni mia tano'))?.swahili).toBe('Ni mia tano, dada.');
  });

  it("keeps the learner's own boss (they're addressing someone else) and leaves men's lessons alone", () => {
    const uber = personalizeLesson(find('uber-nairobi'), her);
    expect(uber.turns[0].swahili).toBe('Niaje boss?');
    const m = personalizeLesson(find('clothes-colours'), him);
    expect(m.turns[0].swahili).toBe('Karibu, mkubwa! Unatafuta nini leo?');
  });

  it('the city terms (mdosi, kiongozi, mzitu, mkubwa, chief) become mama / dada / sista too', () => {
    const matatu = personalizeLesson(find('matatu-to-town'), her);
    expect(matatu.turns[6].swahili).toBe('Saa hii ni rush hour, sista. Bei inapanda.');
    expect(matatu.turns[6].english).toBe("Right now it's rush hour, sis. The price goes up.");
    const petrol = personalizeLesson(find('petrol-station'), her);
    expect(petrol.turns[0].swahili.startsWith('Karibu, mama!')).toBe(true);
    expect(petrol.turns[0].english.startsWith('Welcome, madam!')).toBe(true);
  });

  it('leaves mkubwa / kiongozi alone when they mean "big" / "leader"', () => {
    const fam = personalizeLesson(find('family-visit'), her);
    expect(JSON.stringify(fam.turns)).toContain('Kaka yangu mkubwa');
  });

  it('keeps glossed words in sync with their line', () => {
    for (const lesson of raw) {
      const l = personalizeLesson(lesson, her);
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
});
