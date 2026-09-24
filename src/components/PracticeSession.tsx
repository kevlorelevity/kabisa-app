import { useMemo, useState } from 'react';
import type { PracticeItem, PracticeOption } from '../types';

interface PracticeSessionProps {
  items: PracticeItem[];
  /** Called once with the first-try score when the last item is answered. */
  onFinish?: (firstTryCorrect: number, total: number) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PracticeSession({ items, onFinish }: PracticeSessionProps) {
  // Bumping `round` reshuffles item order and chip order for "Practice again".
  const [round, setRound] = useState(0);
  const order = useMemo(() => shuffle(items), [items, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const item = order[index];
  const chips = useMemo(() => (item ? shuffle(item.options) : []), [item]);

  if (items.length === 0) return null;

  if (finished) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
          Practice complete
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {firstTry} / {items.length}
        </p>
        <p className="text-sm text-gray-500">right on the first try</p>
        <button
          onClick={() => {
            setRound((r) => r + 1);
            setIndex(0);
            setWrongPicks([]);
            setSolved(false);
            setFirstTry(0);
            setFinished(false);
          }}
          className="mt-2 px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Practice again
        </button>
      </div>
    );
  }

  function pick(opt: PracticeOption) {
    if (solved || wrongPicks.includes(opt.text)) return;
    if (opt.correct) {
      if (wrongPicks.length === 0) setFirstTry((n) => n + 1);
      setSolved(true);
    } else {
      setWrongPicks((w) => [...w, opt.text]);
    }
  }

  function next() {
    if (index + 1 >= order.length) {
      setFinished(true);
      onFinish?.(firstTry, order.length);
      return;
    }
    setIndex((i) => i + 1);
    setWrongPicks([]);
    setSolved(false);
  }

  const answer = item.options.find((o) => o.correct)!;
  const lastWrong = wrongPicks.length
    ? item.options.find((o) => o.text === wrongPicks[wrongPicks.length - 1])
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {item.mode === 'translate' ? 'Say it in Swahili' : 'Fill the gap'}
        </span>
        <span>
          {index + 1} of {order.length}
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-green-600 transition-all"
          style={{ width: `${((index + (solved ? 1 : 0)) / order.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        {item.mode === 'translate' && (
          <p className="text-gray-700" data-testid="practice-english">
            {item.english}
          </p>
        )}
        <p className="text-xl font-semibold text-gray-900" data-testid="practice-sentence">
          {item.before}
          {solved ? (
            <span className="text-green-700 underline decoration-green-300 decoration-2 underline-offset-4">
              {answer.text}
            </span>
          ) : (
            <span
              aria-label="blank"
              className="inline-block min-w-20 px-2 mx-0.5 rounded-md bg-gray-100 text-gray-400 text-center tracking-widest"
            >
              …
            </span>
          )}
          {item.after}
        </p>
        {item.mode === 'complete' && solved && (
          <p className="text-sm text-gray-500">{item.english}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((opt) => {
          const isWrong = wrongPicks.includes(opt.text);
          const isCorrect = solved && opt.correct;
          return (
            <button
              key={opt.text}
              onClick={() => pick(opt)}
              disabled={solved || isWrong}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors disabled:cursor-default ${
                isCorrect
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : isWrong
                  ? 'border-red-300 bg-red-50 text-red-400 line-through'
                  : solved
                  ? 'border-gray-100 bg-white text-gray-300'
                  : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50'
              }`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {!solved && lastWrong && (
        <p className="text-red-600 text-sm">
          {lastWrong.feedback ?? 'Not quite.'} Try again.
        </p>
      )}

      {solved && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            {item.explanation}
          </p>
          <button
            onClick={next}
            className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
          >
            {index + 1 >= order.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
