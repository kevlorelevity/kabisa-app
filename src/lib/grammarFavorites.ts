import { useSyncExternalStore } from 'react';

// -------- Favourite grammar explainers --------
//
// Local-only (localStorage), like lesson scores. A tiny external store so the
// star in the modal, the library list and the nav count stay in sync.

const KEY = 'ksa_grammar_favorites';
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — favourites last for this session only.
  }
  listeners.forEach((l) => l());
}

export function getFavorites(): string[] {
  return read();
}

export function isFavorite(slug: string): boolean {
  return read().includes(slug);
}

export function toggleFavorite(slug: string): boolean {
  const cur = read();
  const on = !cur.includes(slug);
  write(on ? [...cur, slug] : cur.filter((s) => s !== slug));
  return on;
}

/** Test helper: forget the in-memory cache so the next read hits storage. */
export function resetFavoritesCache(): void {
  cache = null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useGrammarFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, read);
  return {
    favorites,
    isFavorite: (slug: string) => favorites.includes(slug),
    toggle: toggleFavorite,
  };
}
