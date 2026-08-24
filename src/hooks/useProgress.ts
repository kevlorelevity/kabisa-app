import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchModuleProgress, upsertModuleProgress } from '../lib/progress';
import { getModuleProgress, setModuleProgress } from '../storage';
import { useAuth } from './useAuth';
import type { ModuleProgress } from '../types';

const DEFAULT_PROGRESS: ModuleProgress = {
  status: 'not-started',
  addedToReview: false,
  lastReviewed: null,
};

/**
 * `moduleId` is the app-level slug (used for the localStorage fallback key,
 * unchanged from before). `moduleUuid` is the DB primary key `module_progress`
 * actually references — required for the Supabase-backed path, optional so
 * callers can still call this before a module has resolved.
 */
export function useProgress(moduleId: string, moduleUuid?: string) {
  const { user } = useAuth();
  const online = isSupabaseConfigured();

  const [progress, setProgressState] = useState<ModuleProgress>(() =>
    online ? DEFAULT_PROGRESS : (getModuleProgress(moduleId) ?? DEFAULT_PROGRESS),
  );

  useEffect(() => {
    if (!online || !user || !moduleUuid) return;
    let alive = true;
    fetchModuleProgress(user.id, moduleUuid).then((remote) => {
      if (alive && remote) setProgressState(remote);
    });
    return () => {
      alive = false;
    };
  }, [online, user, moduleUuid]);

  // NOTE: the Supabase/localStorage write is fired as a plain statement
  // after setProgressState, never from inside a state-updater function —
  // React (StrictMode in dev) can invoke updater functions more than once,
  // which would double-fire the network/localStorage write.
  const updateProgress = useCallback(
    (updates: Partial<ModuleProgress>) => {
      const next: ModuleProgress = { ...progress, ...updates };
      setProgressState(next);

      if (online && user && moduleUuid) {
        upsertModuleProgress(user.id, moduleUuid, next);
      } else if (!online) {
        setModuleProgress(moduleId, next);
      }
    },
    [progress, moduleId, moduleUuid, online, user],
  );

  return { progress, updateProgress };
}
