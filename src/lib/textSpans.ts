// -------- Pure text helpers shared by the app and the API (no imports) --------
//
// Swahili wording changes: finding the changed span between two versions of a
// line, replacing a span as whole words inside lesson content, and keeping the
// tap-to-explain underlines in step with an edited line.

export const SKIP_KEYS = new Set(['id', 'uuid', 'slug', 'grammar', 'grammarFocus', 'category', 'difficulty', 'theme', 'related', 'type', 'level', 'order', 'emoji', 'englishForms']);

/** Fields that hold Swahili ('one' / 'many' are a noun's singular and plural). */
export const SW_KEYS = new Set(['swahili', 'sanifu', 'before', 'after', 'text', 'one', 'many']);
/** Mixed English notes that quote Swahili words. Only longer spans propagate here. */
export const NOTE_KEYS = new Set(['exampleContext', 'explanation', 'feedback', 'sanifuNote', 'gloss', 'note']);
const WORD = /[\p{L}\p{N}'’-]+/gu;

export interface Span {
  from: string;
  to: string;
}

/** The smallest run of whole words that differs between a and b ("Lete tu." → "Leta tu." gives Lete → Leta). */
export function changedSpan(a: string, b: string): Span | null {
  const wa = [...a.matchAll(WORD)];
  const wb = [...b.matchAll(WORD)];
  if (!wa.length || !wb.length) return null;
  let i = 0;
  while (i < wa.length && i < wb.length && wa[i][0] === wb[i][0]) i++;
  let ja = wa.length - 1;
  let jb = wb.length - 1;
  while (ja >= i && jb >= i && wa[ja][0] === wb[jb][0]) {
    ja--;
    jb--;
  }
  if (i > ja && i > jb) return null; // only punctuation changed
  if (i > ja) return null; // pure insertion — nothing to find elsewhere
  const from = a.slice(wa[i].index, wa[ja].index! + wa[ja][0].length);
  const to = i > jb ? '' : b.slice(wb[i].index, wb[jb].index! + wb[jb][0].length);
  if (!from.trim() || !to.trim() || from === to) return null;
  return { from, to };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function variants(span: Span): Span[] {
  const v = [span];
  if (cap(span.from) !== span.from) v.push({ from: cap(span.from), to: cap(span.to) });
  if (low(span.from) !== span.from) v.push({ from: low(span.from), to: low(span.to) });
  return v;
}

/** Whole-word replacement of a span in every Swahili field (and notes, for longer spans). Returns the count. */
export function propagateSpan(node: unknown, span: Span, count = false): number {
  const res = variants(span).map((v) => ({
    re: new RegExp(`(?<![\\p{L}\\p{N}'’-])${esc(v.from)}(?![\\p{L}\\p{N}'’-])`, 'gu'),
    to: v.to,
  }));
  const notesToo = span.from.length >= 4;
  const toRe = new RegExp(`(?<![\\p{L}\\p{N}'’-])${esc(span.to)}(?![\\p{L}\\p{N}'’-])`, 'iu');
  let n = 0;
  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== 'object') return;
    const entries: Array<[string | number, unknown]> = Array.isArray(obj)
      ? obj.map((v, i) => [i, v])
      : Object.entries(obj as Record<string, unknown>);
    for (const [k, v] of entries) {
      if (typeof k === 'string' && SKIP_KEYS.has(k)) continue;
      // An English note that already names the new word is explaining the swap ("mpaka, not hadi"): leave it.
      const explainsSwap = typeof k === 'string' && NOTE_KEYS.has(k) && typeof v === 'string' && toRe.test(v);
      if (typeof v === 'string' && typeof k === 'string' && !explainsSwap && (SW_KEYS.has(k) || (notesToo && NOTE_KEYS.has(k)))) {
        let out = v;
        for (const r of res) {
          out = out.replace(r.re, () => {
            n++;
            return r.to;
          });
        }
        if (!count && out !== v) (obj as Record<string, unknown>)[k] = out;
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(node);
  return n;
}


const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}'’-]/u.test(c);

/**
 * After a line's Swahili changed from `oldLine`, moves each glossed word to its
 * new place, drops glosses whose words are gone, and stretches a gloss over
 * words inserted right next to it ("taka" + " taka" → "taka taka"). The AI
 * re-gloss that follows an admin edit then refines the explanations.
 */
export function realignWords(turn: { swahili: string; words?: Array<{ text: string }> }, oldLine: string): void {
  const now = turn.swahili;
  if (!turn.words?.length || now === oldLine) return;
  let p = 0;
  while (p < oldLine.length && p < now.length && oldLine[p] === now[p]) p++;
  let sfx = 0;
  while (sfx < oldLine.length - p && sfx < now.length - p && oldLine[oldLine.length - 1 - sfx] === now[now.length - 1 - sfx]) sfx++;
  const oldEnd = oldLine.length - sfx;
  const newEnd = now.length - sfx;
  const delta = now.length - oldLine.length;
  const inserted = now.slice(p, newEnd).trim();
  const smallInsert = inserted.length > 0 && inserted.split(/\s+/).length <= 3 && !/[.,;:!?]/.test(inserted);

  const kept: typeof turn.words = [];
  let cursor = 0;
  let stretched = false;
  for (const w of turn.words) {
    const s = oldLine.indexOf(w.text, cursor);
    if (s === -1) {
      // Wasn't placed in the old line either: keep it only if it now fits.
      if (now.includes(w.text)) kept.push(w);
      continue;
    }
    cursor = s + w.text.length;
    const e = s + w.text.length;
    let ns: number;
    let ne: number;
    if (e <= p) [ns, ne] = [s, e];
    else if (s >= oldEnd) [ns, ne] = [s + delta, e + delta];
    else continue; // the edit cut through this word — its gloss no longer applies
    if (smallInsert && !stretched && (e === p || s === oldEnd)) {
      stretched = true;
      // Words typed right against this gloss become part of it.
      let a = Math.min(ns, p);
      let b = Math.max(ne, newEnd);
      while (a > 0 && isWordChar(now[a - 1])) a--;
      while (b < now.length && isWordChar(now[b])) b++;
      ns = a;
      ne = b;
      while (ns < ne && !isWordChar(now[ns])) ns++;
      while (ne > ns && !isWordChar(now[ne - 1])) ne--;
    }
    const text = now.slice(ns, ne);
    if (text) kept.push({ ...w, text });
  }
  turn.words = kept;
}
