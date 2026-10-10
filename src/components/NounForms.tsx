import type { VocabEntry } from '../types';

type Forms = { one: string | null; many: string | null } | undefined;

/** "kiatu / viatu" · "nguo" (same for one & many) · "homa (no plural)" · "mafuriko (plural only)". */
export function formsText(f: Forms, lang: 'sw' | 'en'): string {
  if (!f) return '';
  // Same word for one and many (n/n nouns: nguo, shule; English: sheep) — show it once.
  if (f.one && f.many) return f.one === f.many ? f.one : `${f.one} / ${f.many}`;
  if (f.one) return lang === 'sw' ? `${f.one} (no plural)` : f.one;
  if (f.many) return lang === 'sw' ? `${f.many} (plural only)` : f.many;
  return '';
}

/** What a vocabulary entry shows: nouns as singular / plural on both sides, everything else as written. */
export function vocabLabels(entry: Pick<VocabEntry, 'swahili' | 'english' | 'nounForms' | 'englishForms'>): { sw: string; en: string } {
  return {
    sw: formsText(entry.nounForms, 'sw') || entry.swahili,
    en: formsText(entry.englishForms, 'en') || entry.english,
  };
}
