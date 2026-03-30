import { useState } from 'react';
import type { FillBlankExercise } from '../types';

interface Props {
  exercise: FillBlankExercise;
  onComplete: () => void;
}

export function ExerciseFillBlank({ exercise, onComplete }: Props) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  function check() {
    const correct = value.trim().toLowerCase() === exercise.answer.toLowerCase();
    setResult(correct ? 'correct' : 'wrong');
    if (correct) onComplete();
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-700">{exercise.prompt}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          disabled={result === 'correct'}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:border-green-500"
          placeholder="Your answer..."
        />
        <button
          onClick={check}
          disabled={result === 'correct'}
          className="px-4 py-1.5 bg-green-700 text-white text-sm rounded hover:bg-green-800 disabled:opacity-50"
        >
          Check
        </button>
      </div>
      {result === 'correct' && (
        <p className="text-green-700 text-sm font-medium">Correct!</p>
      )}
      {result === 'wrong' && (
        <p className="text-red-600 text-sm">Try again.</p>
      )}
    </div>
  );
}
