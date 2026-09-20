import { useState } from 'react';
import type { ConjugationTable, WordGloss } from '../types';

interface TappableSwahiliProps {
  swahili: string;
  words: WordGloss[];
  /**
   * Whether words can be tapped yet. For dialogue turns the spec is: a
   * driver's line is tappable as soon as it's shown; a customer line only
   * becomes tappable once the learner has picked the correct MCQ option
   * for it. When false, the line renders as plain text.
   */
  enabled: boolean;
  className?: string;
  /** 'dark' for use on a dark chat-bubble background (e.g. the learner's own bubble). */
  variant?: 'light' | 'dark';
}

interface Segment {
  text: string;
  gloss: string | null;
  conjugation?: ConjugationTable;
}

/** Splits `swahili` into plain-text and glossed segments, in order. */
function buildSegments(swahili: string, words: WordGloss[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const word of words) {
    const idx = swahili.indexOf(word.text, cursor);
    if (idx === -1) continue; // content mismatch — skip rather than crash
    if (idx > cursor) {
      segments.push({ text: swahili.slice(cursor, idx), gloss: null });
    }
    segments.push({ text: word.text, gloss: word.gloss, conjugation: word.conjugation });
    cursor = idx + word.text.length;
  }
  if (cursor < swahili.length) {
    segments.push({ text: swahili.slice(cursor), gloss: null });
  }
  return segments;
}

/**
 * Renders a Swahili line with tap-to-explain: glossed words/phrases are
 * tappable and show a small popover with the English meaning. Plain text
 * (punctuation, untagged words) renders inert.
 */
export function TappableSwahili({ swahili, words, enabled, className, variant = 'light' }: TappableSwahiliProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const segments = buildSegments(swahili, words);

  if (!enabled || words.length === 0) {
    return <span className={className}>{swahili}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.gloss === null) {
          return <span key={i}>{seg.text}</span>;
        }
        const isOpen = openIndex === i;
        return (
          <span key={i} className="relative">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={`rounded px-0.5 -mx-0.5 underline underline-offset-2 transition-colors ${
                variant === 'dark' ? 'decoration-green-300' : 'decoration-green-400'
              } ${
                isOpen
                  ? 'bg-green-100 text-green-900'
                  : variant === 'dark'
                  ? 'hover:bg-white/15'
                  : 'hover:bg-green-50'
              }`}
            >
              {seg.text}
            </button>
            {isOpen && (
              <span
                role="tooltip"
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 w-max rounded-md bg-gray-900 text-white text-xs leading-snug px-2.5 py-1.5 shadow-lg ${
                  seg.conjugation ? 'max-w-[16rem]' : 'max-w-[14rem]'
                }`}
              >
                {seg.gloss}
                {seg.conjugation && (
                  <ConjugationGrid table={seg.conjugation} current={seg.text} />
                )}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function ConjugationGrid({ table, current }: { table: ConjugationTable; current: string }) {
  return (
    <span className="block mt-2 pt-2 border-t border-white/20">
      <span className="block font-semibold">
        {table.verb} · {table.tense}
      </span>
      <span className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1">
        {table.rows.map((row) => {
          const active = row.form.toLowerCase() === current.toLowerCase();
          return (
            <span key={row.form} className="contents">
              <span className={active ? 'text-green-300' : 'text-gray-400'}>{row.pronoun}</span>
              <span className={active ? 'font-bold text-green-300' : ''}>{row.form}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
