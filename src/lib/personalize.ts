import type { DialogueTurn, Lesson } from '../types';
import { getCountry } from './countries';
import type { Gender } from './profile';

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
  /** 'female': the other speakers call the learner mama / dada / sista instead of boss / bwana / mdosi / chief…. */
  gender?: Gender;
}

export const DEFAULT_PERSONA: Persona = { name: 'John', countrySw: 'Uganda', countryEn: 'Uganda', city: 'Kampala' };

/** Fields that hold Swahili text; everything else is English (glosses, notes, translations). */
const SWAHILI_KEYS = new Set(['swahili', 'text', 'before', 'after', 'sanifu']);
const SKIP_KEYS = new Set(['id', 'uuid', 'grammar', 'grammarFocus', 'category', 'difficulty', 'theme']);

export function personaFor(name: string | null | undefined, countryCode: string | null | undefined, gender?: Gender | null): Persona {
  const c = getCountry(countryCode);
  const n = name?.trim();
  return {
    name: n || DEFAULT_PERSONA.name,
    countrySw: c?.sw ?? DEFAULT_PERSONA.countrySw,
    countryEn: c?.en ?? DEFAULT_PERSONA.countryEn,
    city: c?.city ?? DEFAULT_PERSONA.city,
    ...(gender ? { gender } : {}),
  };
}

function isDefault(p: Persona): boolean {
  return (
    p.name === DEFAULT_PERSONA.name &&
    p.countrySw === DEFAULT_PERSONA.countrySw &&
    p.countryEn === DEFAULT_PERSONA.countryEn &&
    p.city === DEFAULT_PERSONA.city &&
    p.gender !== 'female'
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

// -------- Addressing a woman --------
//
// The scripts have the other speakers call the learner "boss" or "bwana" — or one of the
// city variants mdosi, kiongozi, mzitu, mkubwa, chief. For a woman that
// becomes mama (sellers, fundis, attendants — respectful, any age), dada (drivers, a passer-by
// — "sister") or sista (the makanga, football banter — street-friendly). Only the other
// speakers' lines change: when the learner says "boss" they're addressing someone else.

export type FemaleAddress = 'mama' | 'dada' | 'sista';

const ADDRESS_EN: Record<FemaleAddress, string> = { mama: 'madam', dada: 'sister', sista: 'sis' };
const ADDRESS_GLOSS: Record<FemaleAddress, string> = {
  mama: '"Mama" — the respectful, friendly way to address a woman of any age, like "madam".',
  dada: '"Sister" — a friendly way to address a woman around your age.',
  sista: '"Sis" — street-friendly Sheng for a young woman.',
};

export function femaleAddressFor(speaker: string): FemaleAddress {
  if (/makanga|wafula|shabiki/i.test(speaker)) return 'sista';
  if (/dereva|mwangi|jirani|rafiki/i.test(speaker)) return 'dada';
  return 'mama';
}

// The city terms (mdosi, kiongozi, mzitu, mkubwa, chief) also have everyday meanings —
// "kaka yangu mkubwa" (my big brother), "kiongozi mzuri" (a good leader) — so they only count
// as a form of address right after a comma and before punctuation: "Karibu, mkubwa!".
const CITY = 'mdosi|kiongozi|mzitu|mkubwa|chief';
const SW_MALE = new RegExp(`\\b(boss|bwana)\\b|(?<=,\\s*)(${CITY})(?=\\s*[,.!?…])`, 'gi');
const EN_MALE = /\b(boss|sir|chief|big man)\b/gi;
/** Non-global twin for .test() — a global regex keeps lastIndex between calls. */
const HAS_MALE = new RegExp(SW_MALE.source, 'i');
const SOLO_MALE = new RegExp(`^(boss|bwana|${CITY})$`, 'i');

function keepCase(found: string, word: string): string {
  return found[0] === found[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;
}

/** The line as spoken to a woman (only lines by the other speaker change). */
export function addressWoman(turn: DialogueTurn): DialogueTurn {
  if (turn.role !== 'auto' || !HAS_MALE.test(turn.swahili)) return turn;
  const a = femaleAddressFor(turn.speaker);
  const sw = (s: string) => s.replace(SW_MALE, (m) => keepCase(m, a));
  const en = (s: string) => s.replace(EN_MALE, (m) => keepCase(m, ADDRESS_EN[a]));
  // Which words this line really uses to address the learner (so "mti mkubwa" in the same line stays put).
  const used = new Set((turn.swahili.match(SW_MALE) ?? []).map((m) => m.toLowerCase()));
  return {
    ...turn,
    swahili: sw(turn.swahili),
    english: en(turn.english),
    ...(turn.literal ? { literal: en(turn.literal) } : {}),
    ...(turn.sanifu ? { sanifu: sw(turn.sanifu) } : {}),
    words: turn.words.map((w) => {
      const solo = SOLO_MALE.test(w.text) && used.has(w.text.toLowerCase());
      if (!solo && !HAS_MALE.test(w.text)) return w;
      if (!solo) return { ...w, text: sw(w.text), gloss: en(w.gloss) };
      // A lone glossed word has no comma around it, so swap it directly.
      const swapped = keepCase(w.text, a);
      const { grammar: _drop, ...rest } = w; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...rest, text: swapped, gloss: ADDRESS_GLOSS[a] };
    }),
  };
}

export function personalizeLesson(lesson: Lesson, p: Persona): Lesson {
  if (isDefault(p)) return lesson;
  const out = walk(lesson, p, null);
  if (p.gender === 'female') out.turns = out.turns.map(addressWoman);
  return out;
}
