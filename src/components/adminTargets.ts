import type { DialogueTurn, PracticeItem, VocabEntry } from '../types';
import type { EditField, SuggestTarget } from './adminContext';

// Pencil targets with their Swahili and English fields, so one ✎ edits both in one modal.

const join = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' | ');

export function vocabTarget(entry: VocabEntry, label: string): SuggestTarget {
  const fields: EditField[] = [];
  const nf = entry.nounForms;
  if (nf) {
    const ef = entry.englishForms ?? { one: entry.english, many: null };
    // The card's headword follows the form it is written as.
    const sw = (form: string | null) => (form && form === entry.swahili ? ('swahili' as const) : undefined);
    const en = (form: string | null) => (form && form === entry.english ? ('english' as const) : undefined);
    fields.push(
      { key: 'sw-one', label: 'Swahili · singular', lang: 'sw', text: nf.one ?? '', placeholder: '(no singular)', merge: { key: 'nounForms', sub: 'one', base: nf, also: sw(nf.one) } },
      { key: 'sw-many', label: 'Swahili · plural', lang: 'sw', text: nf.many ?? '', placeholder: '(no plural)', merge: { key: 'nounForms', sub: 'many', base: nf, also: sw(nf.many) } },
      { key: 'en-one', label: 'English · singular', lang: 'en', text: ef.one ?? '', placeholder: '(no singular)', merge: { key: 'englishForms', sub: 'one', base: ef, also: en(ef.one) } },
      { key: 'en-many', label: 'English · plural', lang: 'en', text: ef.many ?? '', placeholder: '(no plural)', merge: { key: 'englishForms', sub: 'many', base: ef, also: en(ef.many) } },
    );
  } else {
    fields.push({ key: 'sw', label: 'Swahili', lang: 'sw', text: entry.swahili }, { key: 'en', label: 'English', lang: 'en', text: entry.english });
  }
  if (entry.exampleContext) fields.push({ key: 'ctx', label: 'Usage line (grey, under the word)', lang: 'en', text: entry.exampleContext, multiline: true });
  return {
    targetType: 'vocab',
    label,
    currentText: join([entry.swahili, entry.english, entry.exampleContext]),
    itemId: entry.id,
    fields,
  };
}

export function lineTarget(turn: Pick<DialogueTurn, 'id' | 'speaker' | 'swahili' | 'english'>): SuggestTarget {
  return {
    targetType: 'turn.swahili',
    label: `Line · ${turn.speaker}`,
    currentText: turn.swahili,
    itemId: turn.id,
    fields: [
      { key: 'sw', label: 'Swahili', lang: 'sw', text: turn.swahili, multiline: true },
      { key: 'en', label: 'English', lang: 'en', text: turn.english, multiline: true },
    ],
  };
}

export function practiceTarget(item: PracticeItem): SuggestTarget {
  const sentence = `${item.before}[${item.options.map((o) => (o.correct ? `✓${o.text}` : o.text)).join(' | ')}]${item.after}`;
  return {
    targetType: 'practice.sentence',
    label: 'Practice · sentence',
    currentText: sentence,
    itemId: item.id,
    fields: [
      { key: 'sw', label: 'Swahili sentence · [✓right | wrong | wrong] marks the gap', lang: 'sw', text: sentence, multiline: true },
      { key: 'en', label: 'English prompt', lang: 'en', text: item.english, multiline: true },
    ],
  };
}

export function wordTarget(args: { text: string; gloss: string; line?: string; turnId?: string; index?: number }): SuggestTarget {
  return {
    targetType: 'word.gloss',
    label: `Word · “${args.text}”`,
    currentText: `${args.text} — ${args.gloss}`,
    itemId: args.turnId,
    wordIndex: args.turnId ? args.index : undefined,
    fields: [
      { key: 'sw', label: 'Swahili word (changes the line too)', lang: 'sw', text: args.text, inLine: args.turnId ? args.line : undefined },
      { key: 'en', label: 'Meaning (English)', lang: 'en', text: args.gloss, multiline: true },
    ],
  };
}

/** Single-field targets: Swahili for answer choices and sentences, English for everything else. */
export function defaultFields(t: SuggestTarget): EditField[] {
  if (t.fields?.length) return t.fields;
  const sw = /^(turn\.option|turn\.swahili|practice\.sentence)/.test(t.targetType);
  return [{ key: 'text', label: sw ? 'Swahili' : 'Text', lang: sw ? 'sw' : 'en', text: t.currentText, multiline: true }];
}
