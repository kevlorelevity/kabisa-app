import { useEffect, useState } from 'react';
import type { Module } from '../types';
import { listModules } from '../lib/api';

// Local fallback: JSON content files bundled at build time. Used before Supabase
// resolves, and permanently when Supabase is not configured.
const moduleFiles = import.meta.glob('../../content/modules/*.json', {
  eager: true,
}) as Record<string, { default: Module }>;

const localModules: Module[] = Object.values(moduleFiles).map((f) => f.default);

// Module-scoped cache so all useModules() call sites share a single fetch.
let remoteCache: Module[] | null = null;
let inFlight: Promise<Module[] | null> | null = null;

function fetchOnce(): Promise<Module[] | null> {
  if (remoteCache) return Promise.resolve(remoteCache);
  if (inFlight) return inFlight;
  inFlight = listModules()
    .then((mods) => {
      if (mods && mods.length > 0) remoteCache = mods;
      return mods;
    })
    .catch((err) => {
      console.error('[useModules] Supabase fetch failed:', err);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Returns the list of modules. Reads from Supabase when configured, falling
 * back to the bundled JSON. Fetch is deduped across call sites and cached
 * for the lifetime of the page.
 */
export function useModules(): Module[] {
  const [modules, setModules] = useState<Module[]>(
    () => remoteCache ?? localModules,
  );

  useEffect(() => {
    let alive = true;
    fetchOnce().then((mods) => {
      if (alive && mods && mods.length > 0) setModules(mods);
    });
    return () => {
      alive = false;
    };
  }, []);

  return modules;
}
