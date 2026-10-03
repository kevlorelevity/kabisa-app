import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { cleanName, loadProfile, saveProfile, type LearnerProfile } from '../lib/profile';
import { personaFor } from '../lib/personalize';
import { ProfileContext, type ProfileContextValue } from './profileContext';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadProfile(userId).then((p) => {
      if (!alive) return;
      setProfile(p);
      setLoadedFor(userId);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const save = useCallback(
    async (p: LearnerProfile) => {
      await saveProfile(userId, p);
      setProfile({ ...p, displayName: cleanName(p.displayName) });
    },
    [userId],
  );

  const value: ProfileContextValue = useMemo(
    () => ({
      profile,
      loading: loadedFor !== userId,
      persona: personaFor(profile?.displayName, profile?.nationality),
      save,
    }),
    [profile, loadedFor, userId, save],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
