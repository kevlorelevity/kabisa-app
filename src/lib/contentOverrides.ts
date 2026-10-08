import { useSyncExternalStore } from 'react';
import type { GrammarTopic, LevelInfo, Lesson } from '../types';
import { getSupabase } from './supabase';
import type { Persona } from './personalize';
import { personalizeText, DEFAULT_PERSONA } from './personalize';

// -------- Live content edits ("edit in place" from the admin pencils) --------
//
// Lesson, grammar and level content ships as JSON in the bundle. When an admin
// proposes new text in the pencil modal, the change is stored as a row in
// public.content_override and applied on top of the bundled content at
// runtime — for every learner, without a code deploy. Each row says "inside
// this lesson / grammar topic / level, replace this exact text with that".
//
// Overrides apply to the RAW content (before "John from Uganda" is swapped for
// the learner), so what the admin saw on screen is mapped back to the raw text
// before saving (see resolveOverride).

export type ScopeType = 'lesson' | 'grammar' | 'level';

export interface ContentOverride {
  id: string;
  created_at?: string;
  scope_type: ScopeType;
  scope_id: string;
  item_id: string | null;
  find_text: string;
  replace_text: string;
  /** Also apply a Swahili wording change to every lesson (default true). */
  propagate?: boolean;
}

/** Separators used when a pencil shows several fields joined together (vocab, tables, examples…). */
const SEGMENT_SPLIT = /\n| \| | — |\[|\]|✓/;
const SKIP_KEYS = new Set(['id', 'uuid', 'slug', 'grammar', 'grammarFocus', 'category', 'difficulty', 'theme', 'related', 'type', 'level', 'order', 'emoji']);

// ---- pure helpers (unit-tested) ----

/** Replaces every string leaf exactly equal to `find` (skipping id-like keys). Returns the count. */
export function replaceLeaves(node: unknown, find: string, replace: string): number {
  if (!find || find === replace || !node || typeof node !== 'object') return 0;
  let n = 0;
  const entries: Array<[string | number, unknown]> = Array.isArray(node)
    ? node.map((v, i) => [i, v])
    : Object.entries(node as Record<string, unknown>);
  for (const [k, v] of entries) {
    if (typeof k === 'string' && SKIP_KEYS.has(k)) continue;
    if (typeof v === 'string') {
      if (v === find) {
        (node as Record<string | number, unknown>)[k] = replace;
        n++;
      }
    } else if (v && typeof v === 'object') {
      n += replaceLeaves(v, find, replace);
    }
  }
  return n;
}

/** Finds the sub-object whose `id` (or `slug`) equals itemId. */
function findItem(node: unknown, itemId: string): unknown {
  if (!node || typeof node !== 'object') return undefined;
  const rec = node as Record<string, unknown>;
  if (rec.id === itemId || rec.uuid === itemId) return node;
  for (const v of Array.isArray(node) ? node : Object.values(rec)) {
    const hit = findItem(v, itemId);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Applies one override to a scope object (mutating it). Tries the item first
 * (e.g. the one dialogue turn), then the whole scope; for joined multi-field
 * texts, applies the changed parts one by one. Returns how many strings changed.
 */
export function applyOverrideTo(scope: unknown, o: Pick<ContentOverride, 'item_id' | 'find_text' | 'replace_text'>): number {
  const targets = [o.item_id ? findItem(scope, o.item_id) : undefined, scope].filter(Boolean);
  for (const t of targets) {
    const n = replaceLeaves(t, o.find_text, o.replace_text);
    if (n) return n;
    const a = o.find_text.split(SEGMENT_SPLIT);
    const b = o.replace_text.split(SEGMENT_SPLIT);
    if (a.length > 1 && a.length === b.length) {
      let m = 0;
      a.forEach((part, i) => {
        if (part.trim() && part !== b[i]) m += replaceLeaves(t, part.trim(), b[i].trim());
      });
      if (m) return m;
    }
  }
  return 0;
}

/** True if `text` appears (as a whole leaf or as a part of a joined text) somewhere in scope. */
export function canApply(scope: unknown, o: Pick<ContentOverride, 'item_id' | 'find_text' | 'replace_text'>): boolean {
  return applyOverrideTo(structuredClone(scope), o) > 0;
}

function collectLeaves(node: unknown, out: Set<string>): Set<string> {
  if (typeof node === 'string') out.add(node);
  else if (Array.isArray(node)) node.forEach((v) => collectLeaves(v, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) if (!SKIP_KEYS.has(k)) collectLeaves(v, out);
  return out;
}

/** Undo the learner-persona swap on one displayed string, using the raw strings of the scope. */
function toRaw(displayed: string, rawLeaves: Set<string>, p: Persona): string {
  if (rawLeaves.has(displayed)) return displayed;
  for (const raw of rawLeaves) {
    if (personalizeText(raw, p, true) === displayed || personalizeText(raw, p, false) === displayed) return raw;
  }
  return displayed;
}

function depersonalize(text: string, p: Persona): string {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let t = text;
  if (p.name !== DEFAULT_PERSONA.name) t = t.replace(new RegExp(`\\b${esc(p.name)}\\b`, 'g'), DEFAULT_PERSONA.name);
  if (p.city !== DEFAULT_PERSONA.city) t = t.replace(new RegExp(`\\b${esc(p.city)}\\b`, 'g'), DEFAULT_PERSONA.city);
  for (const c of [p.countrySw, p.countryEn])
    if (c !== DEFAULT_PERSONA.countrySw) t = t.replace(new RegExp(`\\b${esc(c)}\\b`, 'g'), DEFAULT_PERSONA.countrySw);
  return t;
}

/**
 * Turns "the admin changed what they saw from A to B" into an override on the
 * raw content, or null if the text can't be located (then it's a suggestion only).
 */
export function resolveOverride(
  scope: { type: ScopeType; id: string; content: unknown } | null,
  itemId: string | undefined,
  displayedCurrent: string,
  displayedProposed: string,
  persona: Persona,
): Omit<ContentOverride, 'id'> | null {
  if (!scope || !displayedProposed.trim() || displayedProposed === displayedCurrent) return null;
  const leaves = collectLeaves(scope.content, new Set());
  let find = toRaw(displayedCurrent, leaves, persona);
  const replace = depersonalize(displayedProposed, persona);
  // Joined texts: map each part back to raw separately.
  if (find === displayedCurrent && !leaves.has(find)) {
    for (const part of displayedCurrent.split(SEGMENT_SPLIT).map((x) => x.trim()).filter(Boolean)) {
      const raw = toRaw(part, leaves, persona);
      if (raw !== part) find = find.replace(part, raw);
    }
  }
  const o = { scope_type: scope.type, scope_id: scope.id, item_id: itemId ?? null, find_text: find, replace_text: replace };
  return canApply(scope.content, o) ? o : null;
}

// ---- app-wide propagation of Swahili wording changes ----
//
// An admin usually fixes a word in ONE place (a practice chip, a dialogue line,
// a flashcard). The same wording lives in other places too, so a Swahili change
// is also applied, as a whole-word replacement, to every lesson's Swahili text
// (dialogue lines, answer choices, word glosses, practice sentences and chips,
// vocabulary/flashcards, Sanifu forms) and to explanatory notes. English edits
// stay where they were made.

/** Fields that hold Swahili. */
const SW_KEYS = new Set(['swahili', 'sanifu', 'before', 'after', 'text']);
/** Mixed English notes that quote Swahili words. Only longer spans propagate here. */
const NOTE_KEYS = new Set(['exampleContext', 'explanation', 'feedback', 'sanifuNote', 'gloss', 'note']);
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

function leafKeys(node: unknown, text: string, out: Set<string>, key?: string): Set<string> {
  if (typeof node === 'string') {
    if (key && node.includes(text)) out.add(key);
  } else if (Array.isArray(node)) node.forEach((v) => leafKeys(v, text, out, key));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) if (!SKIP_KEYS.has(k)) leafKeys(v, text, out, k);
  return out;
}

/** The Swahili spans an override changes (none for English-only edits). */
export function swahiliSpans(scope: unknown, o: Pick<ContentOverride, 'find_text' | 'replace_text'>): Span[] {
  const pairs: Array<[string, string]> = [[o.find_text, o.replace_text]];
  const a = o.find_text.split(SEGMENT_SPLIT);
  const b = o.replace_text.split(SEGMENT_SPLIT);
  if (a.length > 1 && a.length === b.length) {
    pairs.length = 0;
    a.forEach((part, i) => part.trim() && part.trim() !== b[i].trim() && pairs.push([part.trim(), b[i].trim()]));
  }
  const spans: Span[] = [];
  for (const [find, rep] of pairs) {
    const keys = leafKeys(scope, find, new Set());
    if (![...keys].some((k) => SW_KEYS.has(k))) continue;
    const span = changedSpan(find, rep);
    if (span && !spans.some((x) => x.from === span.from)) spans.push(span);
  }
  return spans;
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

/** How many OTHER places a pending edit would also change (for the admin modal). */
export function countPropagation(scope: unknown, o: Pick<ContentOverride, 'find_text' | 'replace_text'>): number {
  if (!scopes) return 0;
  const spans = swahiliSpans(scope, o);
  if (!spans.length) return 0;
  const all = scopes.allLessons();
  let n = 0;
  for (const span of spans) n += propagateSpan(all, span, true);
  // The place being edited is counted too; it isn't "another" place.
  return Math.max(0, n - spans.length);
}

// ---- AI patches & notes (content_patch rows) ----
//
// 'item'      replaces one dialogue turn / practice item (AI edit).
// 'dialogue'  replaces a lesson's whole conversation; 'practice' its practice session.
// 'fields'    merges fields into one turn / practice item / vocabulary card (notes, Sanifu…).
// 'word'      updates one glossed word in a turn (gloss, Sanifu, note); with
//             `everywhere`, its note and Sanifu also show wherever that word is
//             glossed and on flashcards for it, in every lesson.
// In merged values an empty string removes the field.

export type PatchScope = 'item' | 'dialogue' | 'practice' | 'fields' | 'word';

export interface ContentPatch {
  id: string;
  created_at: string;
  lesson_id: string;
  scope: PatchScope;
  item_id: string | null;
  value: unknown;
  /** Word swaps the AI made in this item, applied to every lesson ("hadi" → "mpaka"). */
  swaps?: Span[] | null;
}

export interface WordPatchValue {
  /** The glossed text as written in the lesson (raw, unpersonalised). */
  text: string;
  /** Position in the turn's `words` array (falls back to matching `text`). */
  wordIndex?: number;
  gloss?: string;
  sanifu?: string;
  note?: string;
  everywhere?: boolean;
}

type Rec = Record<string, unknown>;

function mergeFields(target: Rec, fields: Rec, keys?: string[]): void {
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'id' || (keys && !keys.includes(k))) continue;
    if (v === '' || v === null) delete target[k];
    else if (v !== undefined) target[k] = structuredClone(v);
  }
}

const norm = (s: string) => s.trim().toLowerCase();

function findItemIn(lesson: Lesson, id: string): Rec | undefined {
  return (lesson.turns.find((t) => t.id === id) ??
    lesson.practice?.find((x) => x.id === id) ??
    lesson.vocabulary?.find((v) => v.id === id)) as Rec | undefined;
}

/** Note + Sanifu of a word, on every gloss of that word and every flashcard for it. */
export function applyWordEverywhere(lessons: Lesson[], v: WordPatchValue): number {
  const key = norm(v.text);
  const fields: Rec = {};
  if (v.note !== undefined) fields.note = v.note;
  if (v.sanifu !== undefined) fields.sanifu = v.sanifu;
  let n = 0;
  for (const lesson of lessons) {
    for (const turn of lesson.turns) {
      for (const w of turn.words ?? []) {
        if (norm(w.text) === key) {
          mergeFields(w as unknown as Rec, fields);
          n++;
        }
      }
    }
    for (const card of lesson.vocabulary ?? []) {
      if (norm(card.swahili) === key) {
        mergeFields(card as unknown as Rec, fields);
        n++;
      }
    }
  }
  return n;
}

export function applyPatchTo(lesson: Lesson, p: Pick<ContentPatch, 'scope' | 'item_id' | 'value'>): boolean {
  const v = structuredClone(p.value);
  if (p.scope === 'dialogue' && Array.isArray(v)) {
    lesson.turns = v as Lesson['turns'];
    return true;
  }
  if (p.scope === 'practice' && Array.isArray(v)) {
    lesson.practice = v as NonNullable<Lesson['practice']>;
    return true;
  }
  if (p.scope === 'item' && p.item_id && v && typeof v === 'object') {
    const ti = lesson.turns.findIndex((t) => t.id === p.item_id);
    if (ti >= 0) {
      const cur = lesson.turns[ti];
      const next = v as Lesson['turns'][number] & { wordsFresh?: boolean };
      // Same line: the lesson's current glosses win (they may have been improved since the
      // snapshot was taken), plus any word notes / Sanifu the patch added. A re-gloss
      // (wordsFresh) brings new glosses on purpose, so its words are used as they are.
      if (!next.wordsFresh && cur.swahili === next.swahili && cur.words?.length) {
        next.words = cur.words.map((w) => {
          const pw = next.words?.find((x) => x.text === w.text);
          return pw ? { ...w, ...(pw.note ? { note: pw.note } : {}), ...(pw.sanifu ? { sanifu: pw.sanifu } : {}) } : w;
        });
      }
      delete next.wordsFresh;
      lesson.turns[ti] = next;
      return true;
    }
    const pi = (lesson.practice ?? []).findIndex((x) => x.id === p.item_id);
    if (pi >= 0 && lesson.practice) {
      lesson.practice[pi] = v as NonNullable<Lesson['practice']>[number];
      return true;
    }
  }
  if (p.scope === 'fields' && p.item_id && v && typeof v === 'object') {
    const item = findItemIn(lesson, p.item_id);
    if (!item) return false;
    mergeFields(item, v as Rec);
    return true;
  }
  if (p.scope === 'word' && p.item_id && v && typeof v === 'object') {
    const wv = v as WordPatchValue;
    const turn = lesson.turns.find((t) => t.id === p.item_id);
    if (!turn || !wv.text) return false;
    const byIndex = wv.wordIndex !== undefined ? turn.words?.[wv.wordIndex] : undefined;
    const word = byIndex && norm(byIndex.text) === norm(wv.text) ? byIndex : turn.words?.find((w) => norm(w.text) === norm(wv.text));
    if (!word) return false;
    mergeFields(word as unknown as Rec, wv as unknown as Rec, ['gloss', 'sanifu', 'note']);
    if (word.gloss === undefined) word.gloss = wv.text;
    return true;
  }
  return false;
}

// ---- runtime store ----

let applied: ContentOverride[] = [];
let version = 0;
const listeners = new Set<() => void>();
let scopes: {
  lesson: (id: string) => Lesson | undefined;
  grammar: (slug: string) => GrammarTopic | undefined;
  level: (n: string) => LevelInfo | undefined;
  allLessons: () => Lesson[];
} | null = null;

/** Called once by the content modules so this file doesn't import them (no cycles). */
export function registerContentScopes(s: NonNullable<typeof scopes>): void {
  scopes = s;
  if (applied.length) for (const o of applied) applyNow(o);
}

export function scopeContent(type: ScopeType, id: string): unknown {
  if (!scopes) return undefined;
  return type === 'lesson' ? scopes.lesson(id) : type === 'grammar' ? scopes.grammar(id) : scopes.level(id);
}

function applyNow(o: ContentOverride): void {
  const target = scopeContent(o.scope_type, o.scope_id);
  if (!target) return;
  // Spans are read from the scope BEFORE the edit (the old wording must still be there).
  const spans = o.propagate === false || !scopes ? [] : swahiliSpans(target, o);
  const lessons = scopes ? (spans.length ? scopes.allLessons() : o.scope_type === 'lesson' ? [target as Lesson] : []) : [];
  const before = snapshotLines(lessons);
  applyOverrideTo(target, o);
  if (scopes) for (const span of spans) propagateSpan(scopes.allLessons(), span);
  realignChanged(before);
}

// ---- keeping the underlined words (tap-to-explain) in step with edited lines ----

function snapshotLines(lessons: Lesson[]): Map<Lesson['turns'][number], string> {
  const m = new Map<Lesson['turns'][number], string>();
  for (const l of lessons) for (const turn of l.turns ?? []) m.set(turn, turn.swahili);
  return m;
}

function realignChanged(before: Map<Lesson['turns'][number], string>): void {
  for (const [turn, old] of before) if (turn.swahili !== old) realignWords(turn, old);
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

function bump(): void {
  version++;
  listeners.forEach((l) => l());
}

let appliedPatches: ContentPatch[] = [];

function applyPatchNow(p: ContentPatch): void {
  const lesson = scopes?.lesson(p.lesson_id);
  if (lesson) applyPatchTo(lesson, p);
  if (p.scope === 'word' && scopes && (p.value as WordPatchValue | null)?.everywhere) {
    applyWordEverywhere(scopes.allLessons(), p.value as WordPatchValue);
  }
  if (p.swaps?.length && scopes) {
    const all = scopes.allLessons();
    const before = snapshotLines(all);
    for (const swap of p.swaps) propagateSpan(all, swap);
    realignChanged(before);
  }
}

/** Adds AI patches (from the DB, or one that just went live) and re-renders content views. */
export function addPatches(rows: ContentPatch[]): void {
  const seen = new Set(appliedPatches.map((p) => p.id));
  const fresh = rows.filter((p) => !seen.has(p.id));
  if (!fresh.length) return;
  fresh.forEach(applyPatchNow);
  appliedPatches = [...appliedPatches, ...fresh];
  bump();
}

/** Adds overrides (from the DB, or one just saved) and re-renders content views. */
export function addOverrides(rows: ContentOverride[]): void {
  const seen = new Set(applied.map((o) => o.id));
  const fresh = rows.filter((o) => !seen.has(o.id));
  if (!fresh.length) return;
  fresh.forEach(applyNow);
  applied = [...applied, ...fresh];
  bump();
}

let loading: Promise<void> | null = null;
/** Loads all active overrides once per page load. */
export function loadOverrides(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const supa = getSupabase();
    if (!supa) return;
    const [ov, pt] = await Promise.all([
      supa
        .from('content_override')
        .select('id,created_at,scope_type,scope_id,item_id,find_text,replace_text,propagate')
        .eq('active', true)
        .order('created_at', { ascending: true }),
      supa
        .from('content_patch')
        .select('id,created_at,lesson_id,scope,item_id,value,swaps')
        .eq('active', true)
        .order('created_at', { ascending: true }),
    ]);
    if (ov.error) console.error('[overrides] load failed', ov.error);
    if (pt.error) console.error('[patches] load failed', pt.error);
    // Apply both kinds in the order they were made, so later edits win.
    const overrides = ((ov.data ?? []) as ContentOverride[]).map((o) => ({ at: o.created_at ?? '', o }));
    const patches = ((pt.data ?? []) as ContentPatch[]).map((p) => ({ at: p.created_at, p }));
    const all = [...overrides, ...patches].sort((a, b) => a.at.localeCompare(b.at));
    let batch: ContentOverride[] = [];
    for (const x of all) {
      if ('o' in x) batch.push(x.o);
      else {
        if (batch.length) addOverrides(batch);
        batch = [];
        addPatches([x.p]);
      }
    }
    if (batch.length) addOverrides(batch);
  })();
  return loading;
}

/** Re-render when live edits arrive. Returns a number that changes with each batch. */
export function useOverridesVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}

/** How many glosses / flashcards across all lessons show this word (for the "everywhere" checkbox). */
export function countWordPlaces(text: string): number {
  if (!scopes || !text.trim()) return 0;
  const key = norm(text);
  let n = 0;
  for (const lesson of scopes.allLessons()) {
    for (const turn of lesson.turns) for (const w of turn.words ?? []) if (norm(w.text) === key) n++;
    for (const card of lesson.vocabulary ?? []) if (norm(card.swahili) === key) n++;
  }
  return n;
}
