import { useState } from 'react';
import type { VocabEntry as VocabEntryType } from '../types';

interface VocabEntryProps {
  entry: VocabEntryType;
}

export function VocabEntry({ entry }: VocabEntryProps) {
  const [showSanifu, setShowSanifu] = useState(false);

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-semibold text-gray-900">{entry.swahili}</span>
          <span className="text-gray-500 mx-2">—</span>
          <span className="text-gray-700">{entry.english}</span>
          <p className="text-xs text-gray-400 mt-0.5 italic">{entry.exampleContext}</p>
        </div>
        <button
          onClick={() => setShowSanifu((v) => !v)}
          className="text-xs text-green-700 hover:text-green-900 whitespace-nowrap shrink-0 mt-0.5"
        >
          {showSanifu ? 'Sanifu ↑' : 'Sanifu →'}
        </button>
      </div>
      {showSanifu && (
        <div className="mt-2 ml-3 pl-3 border-l-2 border-green-200 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{entry.sanifu}</span>
          <span className="mx-1">·</span>
          {entry.sanifuNote}
        </div>
      )}
    </div>
  );
}
