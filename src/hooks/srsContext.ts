import { createContext } from 'react';
import type { CardState, Rating } from '../types';

export interface SRSContextValue {
  cards: Record<string, CardState>;
  dueKeys: string[];
  dueCount: number;
  loading: boolean;
  schedule: (cardKey: string, rating: Rating) => void;
  /** Seed fresh cards for every key given (unconditional overwrite). */
  seedCards: (cardKeys: string[]) => void;
}

export const SRSContext = createContext<SRSContextValue | undefined>(
  undefined,
);
