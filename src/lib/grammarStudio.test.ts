import { describe, expect, it } from 'vitest';
import { blockToDraft, draftToBlock, examplesToText, problems, slugify, textToExamples, emptyTopic } from './grammarStudio';
import { addGrammarTopics, addOverrides } from './contentOverrides';
import { getGrammarTopic, getGrammarTopics, shippedGrammar } from '../hooks/useGrammar';
import { getRawLessons } from '../hooks/useLessons';
import { normalizeGrammar } from './aiGrammar';
import type { GrammarTopic } from '../types';

describe('grammar studio · editing', () => {
  it('blocks round-trip through the plain-text editor', () => {
    const table = { type: 'table' as const, caption: 'kuenda', headers: ['Person', 'Form'], rows: [['I', 'niende'], ['you', 'uende']] };
    expect(draftToBlock(blockToDraft(table))).toEqual(table);
    expect(draftToBlock({ type: 'table', text: 'A | B | C\nx | y' })).toEqual({ type: 'table', headers: ['A', 'B', 'C'], rows: [['x', 'y', '']] });
    expect(draftToBlock({ type: 'list', text: 'one\n\n two ' })).toEqual({ type: 'list', items: ['one', 'two'] });
    expect(draftToBlock({ type: 'p', text: '   ' })).toBeNull();
  });

  it('examples are Swahili | English | note lines', () => {
    const ex = [{ swahili: 'Nikifika, nitakupigia.', english: "When I arrive, I'll call you." }, { swahili: 'Ukija', english: 'If you come', note: '-ki- = if' }];
    expect(textToExamples(examplesToText(ex))).toEqual(ex);
  });

  it('says what is missing before publishing', () => {
    expect(slugify('“If / When”: -ki- and -po-')).toBe('if-when-ki-and-po');
    const t = { ...emptyTopic(8), slug: 'subjunctive', title: 'x' };
    expect(problems(t, { forPublish: false, takenSlugs: ['subjunctive'] })).toEqual(['There is already a section at /grammar/subjunctive.']);
    expect(problems({ ...t, slug: 'ki-if' }, { forPublish: true })).toEqual(['Write the one-line summary.']);
  });
});

describe('grammar studio · going live', () => {
  const fresh: GrammarTopic = {
    slug: 'ki-if-when',
    level: 8,
    title: '“If / When”: -ki-',
    summary: 'Put -ki- in the verb for “if” or “when”.',
    blocks: [{ type: 'p', text: '**ni- + -ki- + verb**' }],
    examples: [],
    related: ['ki-po-ka'],
    tags: ['verbs'],
    lessons: ['landlord-leak'],
  };

  it('publishes a new section into the guide and the lessons that teach it', () => {
    addGrammarTopics([{ slug: fresh.slug, published: fresh, published_at: '2026-10-15T10:00:00Z' }]);
    expect(getGrammarTopic('ki-if-when')?.title).toBe('“If / When”: -ki-');
    expect(getGrammarTopics().some((t) => t.slug === 'ki-if-when')).toBe(true);
    expect(getRawLessons().find((l) => l.id === 'landlord-leak')?.grammarFocus).toContain('ki-if-when');
    // Off the air again: gone from the guide and the lesson.
    addGrammarTopics([{ slug: fresh.slug, published: { ...fresh, lessons: [] }, published_at: '2026-10-15T10:05:00Z' }]);
    expect(getRawLessons().find((l) => l.id === 'landlord-leak')?.grammarFocus).not.toContain('ki-if-when');
    addGrammarTopics([{ slug: fresh.slug, published: null, published_at: null }]);
    expect(getGrammarTopic('ki-if-when')).toBeUndefined();
  });

  it('a reworked shipped section replaces it; quick edits made before it are already in it', () => {
    const before = getGrammarTopic('subjunctive')!;
    const reworked = { ...shippedGrammar('subjunctive')!, summary: 'Reworked summary.' };
    addGrammarTopics([{ slug: 'subjunctive', published: reworked, published_at: '2026-10-15T10:00:00Z' }]);
    expect(getGrammarTopic('subjunctive')).toBe(before); // same object: open screens update
    expect(before.summary).toBe('Reworked summary.');
    addOverrides([
      { id: 'old', created_at: '2026-10-14T09:00:00Z', scope_type: 'grammar', scope_id: 'subjunctive', item_id: 'subjunctive', find_text: 'Reworked summary.', replace_text: 'OLD EDIT' },
      { id: 'new', created_at: '2026-10-15T11:00:00Z', scope_type: 'grammar', scope_id: 'subjunctive', item_id: 'subjunctive', find_text: 'Reworked summary.', replace_text: 'Newer quick edit.' },
    ]);
    expect(before.summary).toBe('Newer quick edit.');
    addGrammarTopics([{ slug: 'subjunctive', published: null, published_at: null }]);
    expect(getGrammarTopic('subjunctive')?.summary).toBe(shippedGrammar('subjunctive')!.summary);
  });
});

describe('AI first drafts', () => {
  it('keeps the editor’s level and slug, drops unknown related sections and empty blocks', () => {
    const raw = {
      slug: 'whatever',
      level: 3,
      title: 'Rework',
      summary: 'S',
      blocks: [{ type: 'p', text: 'Hello' }, { type: 'table', headers: ['A', 'B'], rows: [['x']] }, { type: 'list', items: [] }],
      examples: [{ swahili: 'Sawa', english: 'OK' }],
      related: ['subjunctive', 'nope'],
      tags: ['Verbs'],
    };
    const base = { ...emptyTopic(7), slug: 'hortative-commands', title: 'x', lessons: ['car-breakdown'] };
    const t = normalizeGrammar(raw, { prompt: 'p', level: 7, base }, ['subjunctive', 'hortative-commands']);
    expect(t.slug).toBe('hortative-commands');
    expect(t.level).toBe(7);
    expect(t.blocks).toEqual([{ type: 'p', text: 'Hello' }, { type: 'table', headers: ['A', 'B'], rows: [['x', '']] }]);
    expect(t.related).toEqual(['subjunctive']);
    expect(t.tags).toEqual(['verbs']);
    expect(t.lessons).toEqual(['car-breakdown']);
  });
});
