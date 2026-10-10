import { useState } from 'react';
import type { VocabEntry as VocabEntryType } from '../types';
import { AudioButton } from './AudioButton';
import { EditPencil } from './EditPencil';
import { vocabTarget } from './adminTargets';
import { vocabLabels } from './NounForms';

interface VocabEntryProps {
  entry: VocabEntryType;
}

export function VocabEntry({ entry }: VocabEntryProps) {
  const [showSanifu, setShowSanifu] = useState(false);
  const hasSanifu = Boolean(entry.sanifu);
  const { sw, en } = vocabLabels(entry);

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <AudioButton text={entry.swahili} className="align-middle -ml-1.5 mr-0.5" />
          <span className="font-semibold text-gray-900">{sw}</span>
          <span className="text-gray-400 mx-2">–</span>
          <span className="text-gray-700">{en}</span>{' '}
          <EditPencil target={vocabTarget(entry, 'Vocabulary / flashcard')} />
          {entry.exampleContext && <p className="text-xs text-gray-400 mt-0.5 italic">{entry.exampleContext}</p>}
          {entry.note && (
            <p className="text-xs text-amber-900 mt-1">
              <span className="font-semibold">💡 Note · </span>
              {entry.note}
            </p>
          )}
        </div>
        {hasSanifu && (
          <button
            onClick={() => setShowSanifu((v) => !v)}
            className="text-xs text-green-700 hover:text-green-900 whitespace-nowrap shrink-0 mt-0.5"
          >
            {showSanifu ? 'Sanifu ↑' : 'Sanifu →'}
          </button>
        )}
      </div>
      {showSanifu && entry.sanifu && (
        <div className="mt-2 ml-3 pl-3 border-l-2 border-green-200 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{entry.sanifu}</span>
          {entry.sanifuNote && (
            <>
              <span className="mx-1">·</span>
              {entry.sanifuNote}
            </>
          )}
        </div>
      )}
    </div>
  );
}
