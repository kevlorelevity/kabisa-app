import type { GrammarBlock, GrammarTopic } from '../types';
import type { SuggestTarget } from './adminContext';

// ✎ targets for a grammar section's copy — shared by the grammar modal and the lesson primer, so
// a quick edit made in either place is the same edit.

export const grammarTitleTarget = (t: GrammarTopic): SuggestTarget => ({
  targetType: 'grammar.title',
  label: 'Grammar title',
  currentText: t.title,
  itemId: t.slug,
});

export const grammarSummaryTarget = (t: GrammarTopic): SuggestTarget => ({
  targetType: 'grammar.summary',
  label: 'Grammar summary',
  currentText: t.summary,
  itemId: t.slug,
});

export function grammarBlockTarget(t: GrammarTopic, b: GrammarBlock, i: number): SuggestTarget {
  return {
    targetType: `grammar.block.${b.type}`,
    label: `Grammar ${b.type === 'p' ? 'paragraph' : b.type} #${i + 1}`,
    currentText:
      b.type === 'table'
        ? [b.caption ?? '', b.headers.join(' | '), ...b.rows.map((r) => r.join(' | '))].filter(Boolean).join('\n')
        : b.type === 'list'
        ? b.items.join('\n')
        : b.text,
    itemId: `${t.slug}#${i}`,
  };
}

export const grammarExampleTarget = (t: GrammarTopic, ex: GrammarTopic['examples'][number], i: number): SuggestTarget => ({
  targetType: 'grammar.example',
  label: 'Grammar example',
  currentText: `${ex.swahili} — ${ex.english}${ex.note ? ` (${ex.note})` : ''}`,
  itemId: `${t.slug}#ex${i}`,
});
