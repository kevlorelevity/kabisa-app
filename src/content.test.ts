import { describe, it, expect } from 'vitest';
import type { Lesson } from './types';
import { getGrammarTopics } from './hooks/useGrammar';
import { LEVELS } from './lib/levels';

// Integrity checks over ALL authored content: every lesson, every grammar link.
const lessonFiles = import.meta.glob('../content/lessons/*.json', { eager: true }) as Record<string, { default: Lesson }>;
const lessons = Object.values(lessonFiles).map((f) => f.default);
const slugs = new Set(getGrammarTopics().map((t) => t.slug));

describe('lesson content', () => {
  it('has 30 lessons across 10 levels, 3 per level', () => {
    expect(lessons).toHaveLength(30);
    for (const lvl of LEVELS) {
      expect(lessons.filter((l) => l.level === lvl.level), `level ${lvl.level}`).toHaveLength(3);
    }
  });

  it('uses unique ids and orders', () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    expect(new Set(lessons.map((l) => l.order)).size).toBe(lessons.length);
  });

  it.each(lessons.map((l) => [l.id, l] as const))('%s: user turns have exactly one correct option', (_id, lesson) => {
    for (const t of lesson.turns.filter((t) => t.role === 'user')) {
      expect(t.options?.filter((o) => o.correct)).toHaveLength(1);
      expect(t.options?.find((o) => o.correct)?.swahili).toBe(t.swahili);
      expect(new Set(t.options?.map((o) => o.swahili)).size).toBe(t.options?.length);
    }
  });

  it.each(lessons.map((l) => [l.id, l] as const))('%s: glossed words appear in order in their line', (_id, lesson) => {
    for (const t of lesson.turns) {
      let cursor = 0;
      for (const w of t.words) {
        const idx = t.swahili.indexOf(w.text, cursor);
        expect(idx, `"${w.text}" in "${t.swahili}"`).toBeGreaterThanOrEqual(0);
        cursor = idx + w.text.length;
      }
    }
  });

  it.each(lessons.map((l) => [l.id, l] as const))('%s: practice items have one correct chip', (_id, lesson) => {
    expect(lesson.practice?.length ?? 0).toBeGreaterThanOrEqual(10);
    for (const p of lesson.practice ?? []) {
      expect(p.options.filter((o) => o.correct)).toHaveLength(1);
      expect(p.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(lessons.map((l) => [l.id, l] as const))('%s: every grammar link points to an explainer', (_id, lesson) => {
    const used = [
      ...(lesson.grammar ?? []),
      ...(lesson.grammarFocus ?? []),
      ...lesson.turns.flatMap((t) => t.words.flatMap((w) => w.grammar ?? [])),
      ...(lesson.practice ?? []).flatMap((p) => p.grammar ?? []),
    ];
    for (const s of used) expect(slugs.has(s), s).toBe(true);
  });
});

describe('grammar explainers', () => {
  it('every related link resolves and every topic has examples', () => {
    for (const t of getGrammarTopics()) {
      expect(t.examples.length, t.slug).toBeGreaterThan(0);
      for (const r of t.related) expect(slugs.has(r), `${t.slug} → ${r}`).toBe(true);
    }
  });

  it('only m/wa and n/n are taught as the standard', () => {
    const nc = getGrammarTopics().find((t) => t.slug === 'noun-classes-mwa-nn');
    expect(nc?.level).toBe(1);
    const other = getGrammarTopics().find((t) => t.slug === 'sanifu-noun-classes');
    expect(other?.title).toMatch(/Sanifu/);
  });
});
