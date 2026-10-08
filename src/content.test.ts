import { describe, it, expect } from 'vitest';
import type { Lesson } from './types';
import { getGrammarTopics } from './hooks/useGrammar';
import { LEVELS } from './lib/levels';

// Integrity checks over ALL authored content: every lesson, every grammar link.
const lessonFiles = import.meta.glob('../content/lessons/*.json', { eager: true }) as Record<string, { default: Lesson }>;
const lessons = Object.values(lessonFiles).map((f) => f.default);
const slugs = new Set(getGrammarTopics().map((t) => t.slug));

describe('lesson content', () => {
  it('every level has at least 3 lessons; levels 5–7 (where new grammar arrives) have at least 6', () => {
    for (const lvl of LEVELS) {
      const n = lessons.filter((l) => l.level === lvl.level).length;
      expect(n, `level ${lvl.level}`).toBeGreaterThanOrEqual(lvl.level >= 5 && lvl.level <= 7 ? 6 : 3);
    }
  });

  it.each(lessons.map((l) => [l.id, l] as const))('%s: uses no grammar from a later level', (_id, lesson) => {
    const topicLevel = new Map(getGrammarTopics().map((t) => [t.slug, t.level]));
    const used = new Set<string>();
    for (const t of lesson.turns) for (const w of t.words) for (const g of w.grammar ?? []) used.add(g);
    for (const p of lesson.practice ?? []) for (const g of p.grammar ?? []) used.add(g);
    for (const g of lesson.grammarFocus ?? []) used.add(g);
    // Levels 1–4 are strict (level-1 grammar only); later levels may preview one level ahead in fixed phrases.
    const slack = lesson.level <= 4 ? 0 : 3;
    const late = [...used].filter((g) => (topicLevel.get(g) ?? 0) > lesson.level + slack);
    expect(late).toEqual([]);
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

describe('noun singular / plural on vocabulary', () => {
  it('every lesson shows forms for its nouns', async () => {
    const files = import.meta.glob('../content/lessons/*.json', { eager: true }) as Record<string, { default: { vocabulary: Array<{ swahili: string; nounForms?: { one: string | null; many: string | null } }> } }>;
    const all = Object.values(files).flatMap((m) => m.default.vocabulary);
    const find = (sw: string) => all.find((v) => v.swahili === sw)?.nounForms;
    expect(find('mwaka')).toEqual({ one: 'mwaka', many: 'miaka' });
    expect(find('viatu')).toEqual({ one: 'kiatu', many: 'viatu' });
    expect(find('shule')).toEqual({ one: 'shule', many: 'shule' });
    expect(all.filter((v) => v.nounForms).length).toBeGreaterThan(140);
  });
});
