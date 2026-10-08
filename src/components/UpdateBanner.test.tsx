import { describe, expect, it } from 'vitest';
import { notesSince, type ReleaseNote } from '../lib/releaseNotes';
import notes from '../../public/release-notes.json';

const n = (id: string): ReleaseNote => ({ id, date: '2026-10-08', title: id, items: ['x'] });

describe('release notes', () => {
  it('returns only the notes newer than the last one seen', () => {
    const list = [n('c'), n('b'), n('a')];
    expect(notesSince(list, 'b').map((x) => x.id)).toEqual(['c']);
    expect(notesSince(list, 'c')).toEqual([]);
    expect(notesSince(list, 'zzz').map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('every note has a unique id, a title and 1–4 short items', () => {
    const all = notes as ReleaseNote[];
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    for (const x of all) {
      expect(x.title.length).toBeGreaterThan(3);
      expect(x.items.length).toBeGreaterThanOrEqual(1);
      expect(x.items.length).toBeLessThanOrEqual(4);
      for (const it of x.items) expect(it.length).toBeLessThanOrEqual(160);
    }
  });
});
