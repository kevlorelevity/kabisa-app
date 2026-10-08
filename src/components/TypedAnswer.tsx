import { useEffect, useRef, useState } from 'react';
import { checkAnswer } from '../lib/typing';

interface TypedAnswerProps {
  /** Accepted answers (first one is shown when revealing). */
  accepted: Array<string | undefined>;
  placeholder?: string;
  /** Wider box for whole sentences. */
  wide?: boolean;
  /** Fires once, the first time the learner gets it wrong or gives up. */
  onMiss: () => void;
  /** Fires when the answer is accepted (or revealed and acknowledged). */
  onSolved: (answer: string) => void;
}

/** A text box with Check / Show answer, forgiving small typos. */
export function TypedAnswer({ accepted, placeholder, wide, onMiss, onSolved }: TypedAnswerProps) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'wrong' | 'close' | 'revealed'>('idle');
  const [missed, setMissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const expected = accepted.find(Boolean) ?? '';

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function miss() {
    if (!missed) {
      setMissed(true);
      onMiss();
    }
  }

  function check() {
    if (state === 'close' || state === 'revealed') return;
    const r = checkAnswer(value, accepted);
    if (r.verdict === 'exact') {
      onSolved(r.expected);
    } else if (r.verdict === 'close') {
      setState('close');
      setValue(r.expected);
      setTimeout(() => onSolved(r.expected), 1400);
    } else {
      setState('wrong');
      miss();
    }
  }

  function reveal() {
    miss();
    setValue(expected);
    setState('revealed');
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === 'wrong') setState('idle');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (state === 'revealed') onSolved(expected);
              else check();
            }
          }}
          readOnly={state === 'close' || state === 'revealed'}
          placeholder={placeholder ?? 'Type your answer…'}
          aria-label="Your answer"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className={`${wide ? 'flex-1' : 'flex-1 sm:flex-none sm:w-64'} min-w-0 rounded-full border px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 ${
            state === 'wrong'
              ? 'border-red-400 focus:ring-red-100'
              : state === 'close' || state === 'revealed'
              ? 'border-green-500 bg-green-50 text-green-800 focus:ring-green-100'
              : 'border-gray-300 focus:border-green-500 focus:ring-green-100'
          }`}
        />
        {state === 'revealed' ? (
          <button
            type="button"
            onClick={() => onSolved(expected)}
            className="shrink-0 px-4 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={!value.trim() || state === 'close'}
            className="shrink-0 px-4 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-40"
          >
            Check
          </button>
        )}
      </div>
      {state === 'wrong' && (
        <p className="text-sm text-red-600">
          Not quite — try again.{' '}
          <button type="button" onClick={reveal} className="underline text-gray-500 hover:text-gray-700">
            Show answer
          </button>
        </p>
      )}
      {state === 'close' && <p className="text-sm text-green-700">Almost! Watch the spelling: {value}</p>}
      {state === 'revealed' && <p className="text-sm text-gray-500">Here’s the answer — say it out loud, then continue.</p>}
    </div>
  );
}
