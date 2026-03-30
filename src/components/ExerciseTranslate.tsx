import { useState } from 'react';
import type { TranslateExercise } from '../types';

interface Props {
  exercise: TranslateExercise;
  onComplete: () => void;
}

export function ExerciseTranslate({ exercise, onComplete }: Props) {
  const [value, setValue] = useState('');
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-gray-700">{exercise.prompt}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={revealed}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
        rows={2}
        placeholder="Type your translation..."
      />
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          disabled={!value.trim()}
          className="px-4 py-1.5 bg-green-700 text-white text-sm rounded hover:bg-green-800 disabled:opacity-50"
        >
          Reveal answer
        </button>
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-gray-500 mb-1">Expected answer:</p>
            <p className="text-green-800 font-medium">{exercise.answer}</p>
          </div>
          <button
            onClick={onComplete}
            className="px-4 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
