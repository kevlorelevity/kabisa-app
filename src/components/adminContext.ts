import { createContext, useContext } from 'react';

/** What a pencil icon points at — enough to find and change it later. */
export interface SuggestTarget {
  /** Machine-readable kind of element, e.g. 'turn.swahili', 'practice.explanation', 'grammar.block'. */
  targetType: string;
  /** Human-readable location, e.g. 'Turn 3 · Mama Mboga'. */
  label: string;
  /** The exact current phrase / text of the element. */
  currentText: string;
  lessonId?: string;
  /** Stable id of the item (turn / practice / vocab uuid, grammar slug…). */
  itemId?: string;
}

export interface AdminContextValue {
  isAdmin: boolean;
  openSuggest: (t: SuggestTarget) => void;
}

export const AdminContext = createContext<AdminContextValue>({ isAdmin: false, openSuggest: () => {} });

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}
