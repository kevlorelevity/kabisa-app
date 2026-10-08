import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLessons } from '../hooks/useLessons';
import { startProgressSync } from '../lib/progressSync';

/** Keeps the signed-in learner's lesson scores and level in Supabase. Renders nothing. */
export function ProgressSync() {
  const { user } = useAuth();
  const lessons = useLessons();
  const lessonsRef = useRef(lessons);
  useEffect(() => {
    lessonsRef.current = lessons;
  }, [lessons]);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    return startProgressSync(userId, () => lessonsRef.current);
  }, [userId]);

  return null;
}
