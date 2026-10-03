import { createContext, useContext } from 'react';
import type { LearnerProfile } from '../lib/profile';
import { DEFAULT_PERSONA, personaFor, type Persona } from '../lib/personalize';

export interface ProfileContextValue {
  profile: LearnerProfile | null;
  /** True until the stored profile has been loaded. */
  loading: boolean;
  persona: Persona;
  save: (p: LearnerProfile) => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loading: false,
  persona: DEFAULT_PERSONA,
  save: async () => {},
});

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}

export { personaFor };
