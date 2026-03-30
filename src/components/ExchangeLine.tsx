import { useState } from 'react';
import type { ExchangeLine as ExchangeLineType } from '../types';

interface ExchangeLineProps {
  line: ExchangeLineType;
}

export function ExchangeLine({ line }: ExchangeLineProps) {
  const [showSanifu, setShowSanifu] = useState(false);
  const hasSanifu = Boolean(line.sanifu);

  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-green-700 w-20 shrink-0 pt-0.5">
          {line.speaker}
        </span>
        <div className="flex-1">
          <span className="text-gray-900">{line.swahili}</span>
          <span className="text-gray-400 text-sm ml-2">— {line.english}</span>
          {hasSanifu && (
            <button
              onClick={() => setShowSanifu((v) => !v)}
              className="ml-2 text-xs text-green-700 hover:text-green-900"
            >
              {showSanifu ? 'Sanifu ↑' : 'Sanifu →'}
            </button>
          )}
          {showSanifu && line.sanifu && (
            <div className="mt-1 pl-3 border-l-2 border-green-200 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{line.sanifu}</span>
              {line.sanifuNote && (
                <>
                  <span className="mx-1">·</span>
                  {line.sanifuNote}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
