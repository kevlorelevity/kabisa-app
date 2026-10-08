import type { VocabEntry } from '../types';

/** "one: mtoto · many: watoto" — shown with every noun in key vocabulary and on flashcards. */
function nounFormsText(f: NonNullable<VocabEntry['nounForms']>): string {
  if (f.one && f.many) return f.one === f.many ? `one & many: ${f.one} (same word)` : `one: ${f.one} · many: ${f.many}`;
  if (f.one) return `${f.one} · no plural`;
  if (f.many) return `${f.many} · plural only`;
  return '';
}

export function NounForms({ forms, className = '' }: { forms: VocabEntry['nounForms']; className?: string }) {
  if (!forms) return null;
  const text = nounFormsText(forms);
  if (!text) return null;
  return <span className={`inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 ${className}`}>{text}</span>;
}
