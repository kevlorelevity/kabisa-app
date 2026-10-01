import { describe, it, expect } from 'vitest';
import lesson1 from '../../content/lessons/uber-nairobi.json';
import lesson2 from '../../content/lessons/uber-nairobi-2.json';
import type { Lesson } from '../types';
import {
  MASTERY_LEVEL,
  advanceDrill,
  buildUpSteps,
  collectPhrases,
  gapVariations,
  initDrill,
  practiceSentence,
} from './drill';

const lessons = [lesson1, lesson2] as unknown as Lesson[];

describe('buildUpSteps', () => {
  it('builds from the end and finishes on the whole phrase', () => {
    expect(buildUpSteps('Mimi naenda Westlands.')).toEqual([
      'Westlands.',
      'naenda Westlands.',
      'Mimi naenda Westlands.',
    ]);
  });
  it('keeps short phrases whole', () => {
    expect(buildUpSteps('Kwa heri.')).toEqual(['Kwa heri.']);
  });
  it('uses at most three steps for long phrases', () => {
    const steps = buildUpSteps('a b c d e f g h');
    expect(steps).toEqual(['g h', 'e f g h', 'a b c d e f g h']);
  });
});

describe('gapVariations', () => {
  for (const lesson of lessons) {
    it(`produces valid variations for every line in "${lesson.title}"`, () => {
      const phrases = [
        ...lesson.turns.map((t) => ({ source: 'turn' as const, sourceId: t.id, swahili: t.swahili, english: t.english })),
        ...(lesson.practice ?? []).map((p) => ({
          source: 'practice' as const,
          sourceId: p.id,
          swahili: practiceSentence(p),
          english: p.english,
        })),
      ];
      let total = 0;
      for (const ph of phrases) {
        for (const v of gapVariations(ph, lesson)) {
          total++;
          // Filling the gap restores the authored sentence exactly.
          expect(v.before + v.answer + v.after).toBe(ph.swahili);
          expect(v.options).toContain(v.answer);
          expect(v.options.length).toBeGreaterThanOrEqual(2);
          // No duplicate chips (case-insensitive).
          expect(new Set(v.options.map((o) => o.toLowerCase())).size).toBe(v.options.length);
        }
      }
      expect(total).toBeGreaterThan(phrases.length);
    });
  }

  it('prefers blanking a different word than the practice item already tested', () => {
    const lesson = lessons[0];
    const item = lesson.practice![0];
    const tested = item.options.find((o) => o.correct)!.text.toLowerCase();
    const vars = gapVariations(
      { source: 'practice', sourceId: item.id, swahili: practiceSentence(item), english: item.english },
      lesson,
    );
    if (vars.length > 1) expect(vars[0].answer.toLowerCase()).not.toBe(tested);
  });
});

describe('collectPhrases', () => {
  it('returns weak turns and practice lines, deduped and in lesson order', () => {
    const lesson = lessons[0];
    const userTurn = lesson.turns.find((t) => t.role === 'user')!;
    const item = lesson.practice![1];
    const phrases = collectPhrases(lesson, [userTurn.id], [item.id]);
    expect(phrases.map((p) => p.sourceId)).toEqual([userTurn.id, item.id]);
  });
});

describe('drill scheduler', () => {
  it('masters every phrase when all recalls are correct, with spaced repeats', () => {
    let s = initDrill(3);
    const gapCounts = [2, 2, 2];
    let guard = 0;
    const seenAt: Record<number, number[]> = { 0: [], 1: [], 2: [] };
    while (s.queue.length && guard++ < 100) {
      const card = s.queue[0];
      if (card.kind !== 'buildup') seenAt[card.phrase].push(s.cardsSeen);
      s = advanceDrill(s, card.kind === 'buildup' ? 'done' : 'correct', gapCounts);
    }
    expect(s.mastered).toEqual([true, true, true]);
    expect(seenAt[0]).toHaveLength(MASTERY_LEVEL);
    // Gaps between appearances never shrink (graduated interval recall).
    const gaps = seenAt[0].slice(1).map((t, i) => t - seenAt[0][i]);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
  });

  it('rebuilds a missed phrase and resets its level', () => {
    let s = initDrill(1);
    s = advanceDrill(s, 'done', [1]); // buildup
    expect(s.queue[0]).toEqual({ kind: 'recall', phrase: 0 });
    s = advanceDrill(s, 'wrong', [1]);
    expect(s.levels[0]).toBe(0);
    expect(s.queue[0]).toEqual({ kind: 'buildup', phrase: 0 });
    expect(s.queue.some((c) => c.kind === 'recall')).toBe(true);
  });

  it('stops after the card cap even if the learner keeps missing', () => {
    let s = initDrill(1);
    let guard = 0;
    while (s.queue.length && guard++ < 500) {
      s = advanceDrill(s, s.queue[0].kind === 'buildup' ? 'done' : 'wrong', [1]);
    }
    expect(s.queue).toHaveLength(0);
    expect(guard).toBeLessThan(500);
  });
});
