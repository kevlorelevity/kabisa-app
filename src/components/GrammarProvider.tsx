import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { getGrammarTopic } from '../hooks/useGrammar';
import { GrammarModal } from './GrammarModal';
import { GrammarModalContext } from './grammarContext';

/**
 * App-wide host for the grammar explainer modal. Any component can call
 * useGrammarModal().openGrammar(slug) — from a word tooltip, a practice
 * explanation, a lesson's grammar list or the /grammar library.
 * "Related" links push onto a small stack so Back returns to the previous topic.
 */
export function GrammarProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([]);

  const openGrammar = useCallback((slug: string) => {
    if (getGrammarTopic(slug)) setStack([slug]);
  }, []);
  const close = useCallback(() => setStack([]), []);
  const value = useMemo(() => ({ openGrammar }), [openGrammar]);

  const topic = stack.length ? getGrammarTopic(stack[stack.length - 1]) : undefined;

  return (
    <GrammarModalContext.Provider value={value}>
      {children}
      {topic && (
        <GrammarModal
          topic={topic}
          canGoBack={stack.length > 1}
          onBack={() => setStack((s) => s.slice(0, -1))}
          onNavigate={(slug) => setStack((s) => [...s, slug])}
          onClose={close}
        />
      )}
    </GrammarModalContext.Provider>
  );
}
