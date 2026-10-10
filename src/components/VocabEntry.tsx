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
  const [showNote, setShowNote] = useState(false);
  const hasNote = Boolean(entry.sanifu || entry.note);
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
        </div>
        {hasNote && (
          <button
            onClick={() => setShowNote((v) => !v)}
            aria-expanded={showNote}
            className="text-xs text-amber-700 hover:text-amber-900 whitespace-nowrap shrink-0 mt-0.5"
          >
            {showNote ? '💡 Note ↑' : '💡 Note'}
          </button>
        )}
      </div>
      {showNote && hasNote && (
        <div className="mt-2 ml-3 pl-3 border-l-2 border-amber-200 text-xs space-y-1">
          {entry.sanifu && (
            <p className="text-gray-500">
              <span className="font-semibold text-sky-800">Sanifu: </span>
              <span className="font-medium text-gray-700">{entry.sanifu}</span>
              {entry.sanifuNote && <> · {entry.sanifuNote}</>}
            </p>
          )}
          {entry.note && (
            <p className="text-amber-900">
              <span className="font-semibold">Note: </span>
              {entry.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
