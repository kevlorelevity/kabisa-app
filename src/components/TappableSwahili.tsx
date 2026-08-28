import { useState } from 'react';
import type { WordGloss } from '../types';

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
    segments.push({ text: word.text, gloss: word.gloss });
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
                className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 w-max max-w-[14rem] rounded-md bg-gray-900 text-white text-xs leading-snug px-2.5 py-1.5 shadow-lg"
              >
                {seg.gloss}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
