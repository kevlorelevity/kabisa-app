import { useState, useCallback } from 'react';
import { getAllSRSCards, setSRSCard } from '../storage';
import { isDue, scheduleCard } from '../srs';
import type { Rating } from '../types';

export function useSRS() {
  const [cards, setCards] = useState(() => getAllSRSCards());

  const dueKeys = Object.entries(cards)
    .filter(([, state]) => isDue(state))
    .map(([key]) => key);

  const schedule = useCallback((cardKey: string, rating: Rating) => {
    setCards((prev) => {
      const current = prev[cardKey];
      if (!current) return prev;
      const next = scheduleCard(current, rating);
      setSRSCard(cardKey, next);
      return { ...prev, [cardKey]: next };
    });
  }, []);

  return { dueKeys, dueCount: dueKeys.length, schedule };
}
