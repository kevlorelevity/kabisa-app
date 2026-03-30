import { useState, useMemo } from 'react';
import type { MatchExercise } from '../types';

interface Props {
  exercise: MatchExercise;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function ExerciseMatch({ exercise, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [done, setDone] = useState(false);

  const pairs = exercise.pairs;
  const current = pairs[currentIndex];

  const options = useMemo(() => {
    const distractors = pairs
      .filter((_, i) => i !== currentIndex)
      .map((p) => p.english);
    const choices = [current.english, ...shuffle(distractors).slice(0, 3)];
    return shuffle(choices);
  }, [currentIndex, pairs]);

  function select(english: string) {
    if (feedback === 'correct') return;
    const correct = english === current.english;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      setTimeout(() => {
        const next = currentIndex + 1;
        if (next >= pairs.length) {
          setDone(true);
          onComplete();
        } else {
          setCurrentIndex(next);
          setFeedback(null);
        }
      }, 600);
    }
  }

  if (done) {
    return <p className="text-green-700 text-sm font-medium">All matched!</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-500 text-xs">Match the Swahili to the correct English</p>
      <p className="text-gray-900 font-semibold">{current.swahili}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => select(opt)}
            className={`text-sm px-3 py-2 rounded border text-left transition-colors ${
              feedback === 'correct' && opt === current.english
                ? 'border-green-500 bg-green-50 text-green-800'
                : feedback === 'wrong' && opt === current.english
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 hover:border-green-400 bg-white'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback === 'wrong' && (
        <p className="text-red-600 text-xs">Not quite — try again.</p>
      )}
      <p className="text-xs text-gray-400">
        {currentIndex + 1} / {pairs.length}
      </p>
    </div>
  );
}
