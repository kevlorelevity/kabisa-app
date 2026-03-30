import type { ModuleProgress, CardState } from './types';

const PROGRESS_KEY = 'ksa_progress';
const SRS_KEY = 'ksa_srs';

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getModuleProgress(moduleId: string): ModuleProgress | null {
  const all = readJSON<Record<string, ModuleProgress>>(PROGRESS_KEY) ?? {};
  return all[moduleId] ?? null;
}

export function setModuleProgress(moduleId: string, progress: ModuleProgress): void {
  const all = readJSON<Record<string, ModuleProgress>>(PROGRESS_KEY) ?? {};
  all[moduleId] = progress;
  writeJSON(PROGRESS_KEY, all);
}

export function getAllSRSCards(): Record<string, CardState> {
  return readJSON<Record<string, CardState>>(SRS_KEY) ?? {};
}

export function getSRSCard(cardKey: string): CardState | null {
  const all = getAllSRSCards();
  return all[cardKey] ?? null;
}

export function setSRSCard(cardKey: string, state: CardState): void {
  const all = getAllSRSCards();
  all[cardKey] = state;
  writeJSON(SRS_KEY, all);
}
