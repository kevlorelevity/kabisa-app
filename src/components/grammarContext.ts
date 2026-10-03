import { createContext, useContext } from 'react';

export interface GrammarModalContextValue {
  /** Open the explainer modal for a grammar slug. */
  openGrammar: (slug: string) => void;
}

// Default is a no-op so components using it still render outside the provider (tests, stories).
export const GrammarModalContext = createContext<GrammarModalContextValue>({ openGrammar: () => {} });

export function useGrammarModal(): GrammarModalContextValue {
  return useContext(GrammarModalContext);
}
