import { useState } from 'react';
import type { VocabEntry } from '../types';

interface LessonFlashcardsProps {
  entries: VocabEntry[];
}

/** English → Swahili → usage notes. Each tap reveals the next side. */
const SIDE_LABELS = ['English', 'Swahili', 'Usage notes'] as const;

export function LessonFlashcards({ entries }: LessonFlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [side, setSide] = useState(0);

  if (entries.length === 0) return null;
  const entry = entries[index];
  const lastSide = SIDE_LABELS.length - 1;

  function go(next: number) {
    setIndex(next);
    setSide(0);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Flashcard side: ${SIDE_LABELS[side]}. Tap to reveal the next side.`}
        onClick={() => setSide((s) => Math.min(s + 1, lastSide))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSide((s) => Math.min(s + 1, lastSide));
          }
        }}
        className="min-h-44 rounded-xl border border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-green-300 transition-colors"
      >
        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">
          {SIDE_LABELS[side]}
        </p>
        {side === 0 && <p className="text-xl text-gray-700 font-medium">{entry.english}</p>}
        {side === 1 && <p className="text-2xl font-bold text-gray-900">{entry.swahili}</p>}
        {side === 2 && (
          <div className="space-y-2 max-w-sm">
            <p className="text-sm text-gray-700">{entry.exampleContext}</p>
            {entry.sanifu && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Sanifu: {entry.sanifu}</span>
                {entry.sanifuNote && <> · {entry.sanifuNote}</>}
              </p>
            )}
          </div>
        )}
        {side < lastSide && <p className="text-xs text-gray-400 mt-3">Tap to reveal</p>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ← Previous
        </button>
        <span className="text-xs text-gray-400">
          Card {index + 1} of {entries.length}
        </span>
        <button
          onClick={() => go(index + 1)}
          disabled={index === entries.length - 1}
          className="px-3 py-1.5 rounded-lg text-green-700 hover:bg-green-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
