import { createContext, useContext } from 'react';

/** One editable text inside the ✎ modal (e.g. the Swahili and the English of a line). */
export interface EditField {
  key: string;
  label: string;
  lang: 'sw' | 'en';
  /** The text as shown on screen ('' when empty). */
  text: string;
  multiline?: boolean;
  placeholder?: string;
  /**
   * Stored by merging into the item (a 'fields' patch) instead of find & replace — used for
   * structured fields like a noun's singular / plural. `base` is the current value of `key`.
   */
  merge?: {
    key: 'nounForms' | 'englishForms';
    sub: 'one' | 'many';
    base: { one: string | null; many: string | null };
    /** Also set this plain field (the card's headword) to the new value. */
    also?: 'swahili' | 'english';
  };
  /** A glossed word: the displayed line it sits in. Changing the word rewrites the line. */
  inLine?: string;
}

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
  /** For a glossed word: its position in the turn's `words` (itemId is then the turn id). */
  wordIndex?: number;
  /** The texts edited together in one modal. Defaults to a single field holding currentText. */
  fields?: EditField[];
}

export interface AdminActivity {
  /** Edits / notes still being saved in the background. */
  saving: number;
  /** AI edits still being worked on. */
  working: number;
  /** Saves or AI edits that failed (open the activity panel to retry / read why). */
  failed: number;
  /** Places the AI wasn't sure about and wants an admin's call on. */
  questions: number;
}

export interface AdminContextValue {
  isAdmin: boolean;
  openSuggest: (t: SuggestTarget) => void;
  /** Prompt the AI to change a lesson's whole conversation or practice session. */
  openDirect: (lessonId: string, scope: 'dialogue' | 'practice') => void;
  openActivity: () => void;
  activity: AdminActivity;
}

export const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  openSuggest: () => {},
  openDirect: () => {},
  openActivity: () => {},
  activity: { saving: 0, working: 0, failed: 0, questions: 0 },
});

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext);
}
