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

// ---- runtime store ----

let applied: ContentOverride[] = [];
let version = 0;
const listeners = new Set<() => void>();
let scopes: {
  lesson: (id: string) => Lesson | undefined;
  grammar: (slug: string) => GrammarTopic | undefined;
  level: (n: string) => LevelInfo | undefined;
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
  if (target) applyOverrideTo(target, o);
}

function bump(): void {
  version++;
  listeners.forEach((l) => l());
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
    const { data, error } = await supa
      .from('content_override')
      .select('id,created_at,scope_type,scope_id,item_id,find_text,replace_text')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[overrides] load failed', error);
      return;
    }
    addOverrides((data ?? []) as ContentOverride[]);
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
