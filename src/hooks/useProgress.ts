import { useState, useCallback } from 'react';
import { getModuleProgress, setModuleProgress } from '../storage';
import type { ModuleProgress } from '../types';

const DEFAULT_PROGRESS: ModuleProgress = {
  status: 'not-started',
  addedToReview: false,
  lastReviewed: null,
};

export function useProgress(moduleId: string) {
  const [progress, setProgressState] = useState<ModuleProgress>(
    () => getModuleProgress(moduleId) ?? DEFAULT_PROGRESS
  );

  const updateProgress = useCallback(
    (updates: Partial<ModuleProgress>) => {
      const next: ModuleProgress = { ...progress, ...updates };
      setModuleProgress(moduleId, next);
      setProgressState(next);
    },
    [moduleId, progress]
  );

  return { progress, updateProgress };
}
