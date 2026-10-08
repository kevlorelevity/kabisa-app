import bundledNotes from '../../public/release-notes.json';

// Release notes shown to learners (see components/UpdateBanner.tsx and README).

export interface ReleaseNote {
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const NOTES = bundledNotes as ReleaseNote[];

/** Notes newer than `id` (all of them when `id` isn't in the list, capped at 3). */
export function notesSince(notes: ReleaseNote[], id: string | null): ReleaseNote[] {
  const i = id ? notes.findIndex((n) => n.id === id) : -1;
  return (i === -1 ? notes : notes.slice(0, i)).slice(0, 3);
}
