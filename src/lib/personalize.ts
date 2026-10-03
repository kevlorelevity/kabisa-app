import type { Lesson } from '../types';
import { getCountry } from './countries';

// The lesson scripts cast the learner as "John from Uganda" (family in
// Kampala). At runtime we swap in the learner's own first name, country and
// a home city — Swahili names in Swahili fields, English names in English
// fields — so every conversation, practice line and flashcard is about them.
// Ids are untouched, so scores and weak-phrase tracking keep working.

export interface Persona {
  name: string;
  countrySw: string;
  countryEn: string;
  city: string;
}

export const DEFAULT_PERSONA: Persona = { name: 'John', countrySw: 'Uganda', countryEn: 'Uganda', city: 'Kampala' };

/** Fields that hold Swahili text; everything else is English (glosses, notes, translations). */
const SWAHILI_KEYS = new Set(['swahili', 'text', 'before', 'after', 'sanifu']);
const SKIP_KEYS = new Set(['id', 'uuid', 'grammar', 'grammarFocus', 'category', 'difficulty', 'theme']);

export function personaFor(name: string | null | undefined, countryCode: string | null | undefined): Persona {
  const c = getCountry(countryCode);
  const n = name?.trim();
  return {
    name: n || DEFAULT_PERSONA.name,
    countrySw: c?.sw ?? DEFAULT_PERSONA.countrySw,
    countryEn: c?.en ?? DEFAULT_PERSONA.countryEn,
    city: c?.city ?? DEFAULT_PERSONA.city,
  };
}

function isDefault(p: Persona): boolean {
  return (
    p.name === DEFAULT_PERSONA.name &&
    p.countrySw === DEFAULT_PERSONA.countrySw &&
    p.countryEn === DEFAULT_PERSONA.countryEn &&
    p.city === DEFAULT_PERSONA.city
  );
}

/** Swaps John/Uganda/Kampala in one string (Swahili or English country name). */
export function personalizeText(s: string, p: Persona, swahili: boolean): string {
  return replaceIn(s, p, swahili);
}

function replaceIn(s: string, p: Persona, swahili: boolean): string {
  return s
    .replace(/Kampala — capital of Uganda/g, `${p.city} — a city in ${p.countryEn}`)
    .replace(/\bJohn\b/g, p.name)
    .replace(/\bUganda\b/g, swahili ? p.countrySw : p.countryEn)
    .replace(/\bKampala\b/g, p.city);
}

function walk<T>(value: T, p: Persona, key: string | null): T {
  if (typeof value === 'string') {
    if (key && SKIP_KEYS.has(key)) return value;
    return replaceIn(value, p, key !== null && SWAHILI_KEYS.has(key)) as T;
  }
  if (Array.isArray(value)) return value.map((v) => walk(v, p, key)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SKIP_KEYS.has(k) ? v : walk(v, p, k);
    return out as T;
  }
  return value;
}

export function personalizeLesson(lesson: Lesson, p: Persona): Lesson {
  if (isDefault(p)) return lesson;
  return walk(lesson, p, null);
}
