import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchAllModuleProgress } from '../lib/progress';
import { getModuleProgress } from '../storage';
import { useAuth } from './useAuth';
import type { Module, ModuleProgress } from '../types';

const DEFAULT_PROGRESS: ModuleProgress = {
  status: 'not-started',
  addedToReview: false,
  lastReviewed: null,
};

/**
 * Batch progress lookup for views (CatalogView) that render one status per
 * module in a list — avoids one network call per module in a render loop.
 * Offline mode reads storage.ts synchronously per module (unchanged
 * behavior, no fetch needed since localStorage reads are already instant).
 */
export function useAllModuleProgress(): {
  getProgress: (module: Module) => ModuleProgress;
  loading: boolean;
} {
  const { user } = useAuth();
  const online = isSupabaseConfigured();

  const [byModuleUuid, setByModuleUuid] = useState<Record<string, ModuleProgress>>({});
  // Lazy initializer, same trick as AuthProvider/SRSProvider: "online with
  // no user yet" is knowable synchronously (SRSProvider/this hook mount
  // inside SignInGate, which has already resolved a session), so there's no
  // need for the effect to ever call setState synchronously in that branch.
  const [loading, setLoading] = useState(() => online && Boolean(user));

  useEffect(() => {
    if (!online || !user) return;
    let alive = true;
    fetchAllModuleProgress(user.id).then((remote) => {
      if (!alive) return;
      setByModuleUuid(remote);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [online, user]);

  const getProgress = useCallback(
    (module: Module): ModuleProgress => {
      if (online) return byModuleUuid[module.uuid] ?? DEFAULT_PROGRESS;
      return getModuleProgress(module.id) ?? DEFAULT_PROGRESS;
    },
    [online, byModuleUuid],
  );

  return { getProgress, loading };
}
