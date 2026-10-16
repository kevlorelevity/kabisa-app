// Answer-choice shuffling. A fair Fisher–Yates shuffle, plus a memory of where the right
// answer sat last time for each question, so replaying a dialogue or practice round never
// shows the correct choice in the same spot twice in a row — learners can't learn positions.

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Where the correct answer was last shown, per question key (lives for the page session). */
const lastSpot = new Map<string, number>();

/**
 * Shuffles one question's choices. The correct one never lands where it was shown last time
 * for the same key, nor (on the first showing) where the author wrote it — usually first.
 */
export function shuffleChoices<T>(key: string, options: readonly T[], isCorrect: (o: T) => boolean): T[] {
  if (options.length < 2) return [...options];
  const authored = options.findIndex(isCorrect);
  const avoid = lastSpot.get(key) ?? authored;
  let out = shuffle(options);
  for (let tries = 0; tries < 20 && avoid >= 0 && out.findIndex(isCorrect) === avoid; tries++) out = shuffle(options);
  lastSpot.set(key, out.findIndex(isCorrect));
  return out;
}

/** Test hook. */
export function resetShuffleMemory(): void {
  lastSpot.clear();
}
