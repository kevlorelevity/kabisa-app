import { useState } from 'react';
import type { VocabEntry, Rating } from '../types';

interface FlashcardProps {
  entry: VocabEntry;
  onRate: (rating: Rating) => void;
}

export function Flashcard({ entry, onRate }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [showSanifu, setShowSanifu] = useState(false);

  return (
    <div className="space-y-6">
      {/* Card face */}
      <div
        className="min-h-40 rounded-xl border border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-green-300 transition-colors"
        onClick={() => !flipped && setFlipped(true)}
      >
        {!flipped ? (
          <>
            <p className="text-2xl font-bold text-gray-900">{entry.swahili}</p>
            <p className="text-xs text-gray-400 mt-3">Click to reveal</p>
          </>
        ) : (
          <>
            <p className="text-xl text-gray-700 font-medium">{entry.english}</p>
            <p className="text-xs text-gray-400 mt-2 italic">{entry.exampleContext}</p>
            {entry.sanifu && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSanifu((v) => !v); }}
                className="mt-3 text-xs text-green-700 hover:text-green-900"
              >
                {showSanifu ? 'Sanifu ↑' : 'Sanifu →'}
              </button>
            )}
            {showSanifu && entry.sanifu && (
              <div className="mt-2 text-xs text-gray-500 max-w-xs">
                <span className="font-medium text-gray-700">{entry.sanifu}</span>
                {entry.sanifuNote && (
                  <>
                    <span className="mx-1">·</span>
                    {entry.sanifuNote}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped && (
        <div className="grid grid-cols-3 gap-3">
          {(['forgot', 'hard', 'easy'] as Rating[]).map((r) => (
            <button
              key={r}
              onClick={() => onRate(r)}
              className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                r === 'forgot'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : r === 'hard'
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
