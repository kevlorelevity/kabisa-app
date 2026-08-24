import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchAllSRSCards, upsertSRSCard, upsertSRSCardsBatch } from '../lib/progress';
import { getAllSRSCards, setSRSCard } from '../storage';
import { initialCardState, isDue, scheduleCard } from '../srs';
import { useAuth } from './useAuth';
import { SRSContext, type SRSContextValue } from './srsContext';
import type { CardState, Rating } from '../types';

export function SRSProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const online = isSupabaseConfigured();

  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    online ? {} : getAllSRSCards(),
  );
  // Lazy initializer, same trick as AuthProvider: "online with no user yet"
  // is a transient/edge state (SRSProvider mounts inside SignInGate, which
  // has already resolved a session by the time this renders), so it's
  // knowable synchronously from data already in hand — no need to set it
  // from inside the effect.
  const [loading, setLoading] = useState(() => online && Boolean(user));

  useEffect(() => {
    if (!online || !user) return;
    let alive = true;
    fetchAllSRSCards(user.id).then((remote) => {
      if (!alive) return;
      setCards(remote);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [online, user]);

  const dueKeys = Object.entries(cards)
    .filter(([, state]) => isDue(state))
    .map(([key]) => key);

  const schedule = useCallback(
    (cardKey: string, rating: Rating) => {
      const current = cards[cardKey];
      if (!current) return;
      const next = scheduleCard(current, rating);
      setCards((prev) => ({ ...prev, [cardKey]: next }));

      if (online && user) {
        upsertSRSCard(user.id, cardKey, next);
      } else {
        setSRSCard(cardKey, next);
      }
    },
    [cards, online, user],
  );

  const seedCards = useCallback(
    (cardKeys: string[]) => {
      const fresh: Record<string, CardState> = {};
      for (const key of cardKeys) {
        fresh[key] = initialCardState();
      }
      setCards((prev) => ({ ...prev, ...fresh }));

      if (online && user) {
        upsertSRSCardsBatch(
          user.id,
          cardKeys.map((vocabId) => ({ vocabId, state: fresh[vocabId] })),
        );
      } else {
        for (const key of cardKeys) {
          setSRSCard(key, fresh[key]);
        }
      }
    },
    [online, user],
  );

  const value: SRSContextValue = {
    cards,
    dueKeys,
    dueCount: dueKeys.length,
    loading,
    schedule,
    seedCards,
  };

  return <SRSContext.Provider value={value}>{children}</SRSContext.Provider>;
}
