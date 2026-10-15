import { useEffect, useRef, useState } from 'react';
import { affirmation, checkAnswer, type AcceptedAnswer } from '../lib/typing';
import { partialNote, type CheckInput } from '../lib/aiCheck';
import { checkWithAi } from '../lib/aiCheckClient';

interface TypedAnswerProps {
  /** Accepted answers (first one is shown when revealing); notes explain the alternatives. */
  accepted: Array<string | AcceptedAnswer | undefined>;
  /** The learner types a whole line (changes how alternatives are acknowledged). */
  whole?: boolean;
  placeholder?: string;
  /** Wider box for whole sentences. */
  wide?: boolean;
  /** Fires once, the first time the learner gets it wrong or gives up. */
  onMiss: () => void;
  /**
   * Fires when the answer is accepted (or revealed and acknowledged). `feedback` acknowledges the
   * learner's choice when more than one answer is right ("You chose “mwambie”! Good — both …").
   */
  onSolved: (answer: string, feedback?: string, credit?: number) => void;
  /**
   * Whole sentences (levels 8+): when the typed line matches no stored answer, ask the AI whether
   * it is still good Swahili for the English. `credit` (0–1) says how many points it earned.
   */
  aiCheck?: Pick<CheckInput, 'english' | 'salient' | 'context' | 'level'>;
  /**
   * Focus the box when it appears. Off for the first answer on a page: on phones focusing opens
   * the keyboard and scrolls the page down, away from the lesson introduction.
   */
  autoFocus?: boolean;
}

/** A text box with Check / Show answer, forgiving small typos. */
export function TypedAnswer({ accepted, whole, placeholder, wide, onMiss, onSolved, autoFocus = true, aiCheck }: TypedAnswerProps) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'wrong' | 'almost' | 'close' | 'accepted' | 'revealed'>('idle');
  // What the AI said about the learner's own sentence.
  const [aiSaid, setAiSaid] = useState<{ feedback: string; corrected?: string; note?: string } | null>(null);
  const [missed, setMissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answers: AcceptedAnswer[] = accepted
    .map((a) => (typeof a === 'string' ? { text: a } : a))
    .filter((a): a is AcceptedAnswer => Boolean(a?.text?.trim()));
  const expected = answers[0]?.text ?? '';

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function miss() {
    if (!missed) {
      setMissed(true);
      onMiss();
    }
  }

  async function check() {
    if (state === 'close' || state === 'revealed' || state === 'checking' || state === 'accepted') return;
    const r = checkAnswer(value, answers);
    if (r.verdict === 'exact') {
      onSolved(r.expected, affirmation(value, answers, r.index, whole) ?? undefined);
    } else if (r.verdict === 'close') {
      setState('close');
      setValue(r.expected);
      const said = affirmation(r.expected, answers, r.index, whole) ?? undefined;
      setTimeout(() => onSolved(r.expected, said), 1400);
    } else if (aiCheck && whole && value.trim().split(/\s+/).length >= 2) {
      setState('checking');
      setAiSaid(null);
      const typed = value;
      const ai = await checkWithAi({ ...aiCheck, typed, expected: answers.map((a) => a.text) });
      if (!ai) {
        setState('wrong');
        miss();
      } else if (ai.verdict === 'correct') {
        const note = ai.credit < 1 && ai.missing.length ? partialNote(ai.credit, ai.missing) : undefined;
        setAiSaid({ feedback: ai.feedback, note });
        setState('accepted');
        const said = [ai.feedback, note].filter(Boolean).join(' ');
        setTimeout(() => onSolved(typed, said || undefined, ai.credit), note ? 2600 : 1400);
      } else {
        setAiSaid({ feedback: ai.feedback, corrected: ai.corrected });
        setState(ai.verdict === 'almost' ? 'almost' : 'wrong');
        miss();
      }
    } else {
      setState('wrong');
      miss();
    }
  }

  function reveal() {
    miss();
    setAiSaid(null);
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
            if (state === 'wrong' || state === 'almost') {
              setState('idle');
              setAiSaid(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (state === 'revealed') onSolved(expected);
              else check();
            }
          }}
          readOnly={state === 'close' || state === 'revealed' || state === 'checking' || state === 'accepted'}
          placeholder={placeholder ?? 'Type your answer…'}
          aria-label="Your answer"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className={`${wide ? 'flex-1' : 'flex-1 sm:flex-none sm:w-64'} min-w-0 rounded-full border px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 ${
            state === 'wrong'
              ? 'border-red-400 focus:ring-red-100'
              : state === 'almost'
              ? 'border-amber-400 focus:ring-amber-100'
              : state === 'close' || state === 'revealed' || state === 'accepted'
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
            disabled={!value.trim() || state === 'close' || state === 'checking' || state === 'accepted'}
            className="shrink-0 px-4 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-40"
          >
            {state === 'checking' ? 'Checking…' : 'Check'}
          </button>
        )}
      </div>
      {state === 'checking' && <p className="text-sm text-gray-500">Checking your sentence…</p>}
      {state === 'accepted' && aiSaid && (
        <div className="text-sm text-green-700 space-y-0.5" data-testid="ai-accepted">
          <p>✓ {aiSaid.feedback || 'That works!'}</p>
          {aiSaid.note && <p className="text-amber-700">{aiSaid.note}</p>}
        </div>
      )}
      {state === 'almost' && aiSaid && (
        <div className="text-sm text-amber-800 space-y-0.5" data-testid="ai-almost">
          <p>Almost! {aiSaid.feedback}</p>
          {aiSaid.corrected && (
            <p>
              Better: <span className="font-semibold">{aiSaid.corrected}</span>
            </p>
          )}
          <p>
            Fix it and check again, or{' '}
            <button type="button" onClick={reveal} className="underline text-gray-500 hover:text-gray-700">
              show the lesson's answer
            </button>
          </p>
        </div>
      )}
      {state === 'wrong' && (
        <p className="text-sm text-red-600">
          {aiSaid?.feedback ? `${aiSaid.feedback} ` : 'Not quite — '}try again.{' '}
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
