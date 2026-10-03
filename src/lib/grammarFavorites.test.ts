import { beforeEach, describe, expect, it } from 'vitest';
import { getFavorites, isFavorite, resetFavoritesCache, toggleFavorite } from './grammarFavorites';

describe('grammar favourites', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFavoritesCache();
  });

  it('toggles and persists', () => {
    expect(isFavorite('past-li')).toBe(false);
    expect(toggleFavorite('past-li')).toBe(true);
    expect(getFavorites()).toEqual(['past-li']);
    resetFavoritesCache();
    expect(isFavorite('past-li')).toBe(true);
    expect(toggleFavorite('past-li')).toBe(false);
    expect(getFavorites()).toEqual([]);
  });
});
