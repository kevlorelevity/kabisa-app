// -------- AI check for whole typed sentences (levels 8+) --------
//
// At the "complete" typing levels the learner types the whole line from the English. There are
// many right ways to say most lines, so when a typed sentence doesn't match any stored answer
// (lib/typing.ts checkAnswer → 'wrong'), it is sent to /api/check-answer and Claude judges it:
//
//   correct — natural, grammatical Swahili that says what the English says in this scene.
//             Points: full when it also uses the lesson's key words / grammar ("salient" items),
//             otherwise PARTIAL_BASE plus a share for each key item used (see creditFor).
//   almost  — right idea, but a small grammar / spelling / agreement slip. No points; the learner
//             sees the slip and a corrected version and can try again.
//   wrong   — a different meaning, or not usable Swahili. No points.
//
// Pure functions shared by api/check-answer.ts (server) and the app (lib/aiCheckClient.ts).

import type { DialogueTurn, WordGloss } from '../types.js';

export type AiVerdict = 'correct' | 'almost' | 'wrong';

/** Points for a correct sentence that uses none of the lesson's key words. */
export const PARTIAL_BASE = 0.5;

export interface CheckInput {
  /** What the learner is asked to say (the English prompt). */
  english: string;
  /** The lesson's line, and any other stored right answers. */
  expected: string[];
  /** What the learner typed. */
  typed: string;
  /** The words / grammatical forms this line is meant to practise. */
  salient: string[];
  /** The line before (for context), e.g. "Dereva: Unaenda wapi?" */
  context?: string;
  level?: number;
}

export interface CheckResult {
  verdict: AiVerdict;
  /** 0–1. */
  credit: number;
  /** One or two short, friendly sentences for the learner. */
  feedback: string;
  /** For 'almost': the learner's own sentence with the slip fixed. */
  corrected?: string;
  /** Key items the learner did not use (only when the credit is partial). */
  missing: string[];
}

export const CHECK_SYSTEM = `You grade typed answers in Kabisa, an app that teaches spoken KENYAN Swahili (the way Nairobi speaks) to foreigners living in Kenya. The learner sees an English line from a conversation and types it in Swahili.

Judge the learner's sentence on its own merits — NOT by how close it is to the lesson's line:
- "correct": natural, grammatical Swahili a Kenyan would understand and accept, saying what the English says in this situation. Everyday Kenyan forms (na- for nina-, ama for au, mingi, sasa for greeting, English loanwords Kenyans really use) and standard (Sanifu) forms are both fine. Missing capitals, punctuation or accents never matter. Be generous with spelling: typos that leave a word recognisable are fine (missing / doubled / swapped letters), as long as the grammar at the front of the word (subject, tense, object prefix) and the final vowel are right. Common Kenyan alternatives are correct too, e.g. "wiki kesho" = "wiki ijayo", "mwaka kesho" = "mwaka ujao", "wiki jana" = "wiki iliyopita", "mpaka" = "hadi", "kusubiri" = "kungoja", "pengine" = "labda", "halafu" = "kisha".
- "almost": the meaning is right but there is a real slip — wrong subject/object prefix, tense marker, noun-class agreement, singular/plural, word order that changes or garbles the meaning, a misspelling that makes a word a different word. Give "corrected": the LEARNER'S OWN sentence with the slip(s) minimally fixed (not the lesson's line).
- "wrong": a different meaning, missing a key part of the message, mostly English, or not usable Swahili.

Also report, for every item in "key items", whether the learner used it — the same word, or the same word correctly inflected for this sentence (e.g. "nimefika" counts for key item "nimefika"; "nilifika" does not, since the tense differs; "naenda" counts for "ninaenda").

"feedback": one or two short, warm sentences to the learner, in English, quoting Swahili in “curly quotes”. For correct: say what works; if they skipped key items, name the lesson's way to say it in a few words (no lecture). For almost: name the slip precisely. For wrong: say what the sentence means or what is missing, gently. Never mention points, scores, AI or grading.`;

export function buildCheckPrompt(input: CheckInput): string {
  const lines = [
    `English to say: ${input.english}`,
    input.context ? `Just before, in the conversation: ${input.context}` : '',
    `The lesson's line: ${input.expected[0] ?? ''}`,
    input.expected.length > 1 ? `Also accepted: ${input.expected.slice(1).join(' / ')}` : '',
    `Key items: ${input.salient.length ? input.salient.map((s) => `“${s}”`).join(', ') : '(none)'}`,
    input.level ? `Learner level: ${input.level} of 10` : '',
    '',
    `Learner typed: ${input.typed}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export const checkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'feedback', 'corrected', 'used'],
  properties: {
    verdict: { type: 'string', enum: ['correct', 'almost', 'wrong'] },
    feedback: { type: 'string' },
    corrected: { type: 'string', description: 'For almost: the learner sentence minimally fixed. Otherwise empty.' },
    used: {
      type: 'array',
      description: 'One entry per key item, in order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'used'],
        properties: { item: { type: 'string' }, used: { type: 'boolean' } },
      },
    },
  },
} as const;

/** Points for a correct answer: full with every key item, else PARTIAL_BASE + a share per item (quarter steps). */
export function creditFor(verdict: AiVerdict, salient: string[], used: string[]): number {
  if (verdict !== 'correct') return 0;
  if (!salient.length) return 1;
  const share = used.length / salient.length;
  const raw = PARTIAL_BASE + (1 - PARTIAL_BASE) * share;
  return Math.min(1, Math.floor(raw * 4) / 4);
}

/** Turns Claude's JSON into a CheckResult, defensively. */
export function normalizeCheck(raw: unknown, salient: string[]): CheckResult {
  const r = (raw ?? {}) as { verdict?: string; feedback?: string; corrected?: string; used?: Array<{ item?: string; used?: boolean }> };
  const verdict: AiVerdict = r.verdict === 'correct' || r.verdict === 'almost' ? r.verdict : 'wrong';
  const usedList = Array.isArray(r.used) ? r.used : [];
  const used = salient.filter((s, i) => {
    const byName = usedList.find((u) => (u.item ?? '').replace(/[“”"]/g, '').trim().toLowerCase() === s.toLowerCase());
    return (byName ?? usedList[i])?.used === true;
  });
  const credit = creditFor(verdict, salient, used);
  return {
    verdict,
    credit,
    feedback: (r.feedback ?? '').trim().slice(0, 400),
    corrected: verdict === 'almost' && r.corrected?.trim() ? r.corrected.trim().slice(0, 300) : undefined,
    missing: verdict === 'correct' && credit < 1 ? salient.filter((s) => !used.includes(s)) : [],
  };
}

const TOKEN = /[\p{L}\p{N}'’-]+/gu;
const LIGHT = new Set(['discourse-particles', 'greetings', 'subject-prefixes', 'ni-copula', 'noun-classes-mwa-nn']);
const MAX_SALIENT = 3;

/**
 * The words a dialogue line is meant to practise: the key word (lib/typing.ts pickKeyWord),
 * then glossed words tied to the lesson's grammar focus, then verbs (glosses with a conjugation
 * table). At most three, each as it appears in the line.
 */
export function salientForTurn(
  turn: Pick<DialogueTurn, 'swahili' | 'words'>,
  keyWord: string | null | undefined,
  focus: string[] = [],
): string[] {
  const out: string[] = [];
  const push = (w?: string) => {
    const t = w?.trim();
    if (t && turn.swahili.toLowerCase().includes(t.toLowerCase()) && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  };
  push(keyWord ?? undefined);
  const glosses: WordGloss[] = turn.words ?? [];
  for (const g of glosses) if ((g.grammar ?? []).some((s) => focus.includes(s) && !LIGHT.has(s))) push(g.text);
  for (const g of glosses) if (g.conjugation) push(g.text);
  if (!out.length) {
    const longest = [...turn.swahili.matchAll(TOKEN)].map((m) => m[0]).sort((a, b) => b.length - a.length)[0];
    push(longest);
  }
  return out.slice(0, MAX_SALIENT);
}

/** "7.5" / "8" — scores can include part points from AI-checked sentences. */
export function fmtScore(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** The line shown under an accepted answer that earned part points. */
export function partialNote(credit: number, missing: string[]): string {
  const pts = credit === 0.5 ? '½' : credit === 0.75 ? '¾' : String(credit);
  const words = missing.map((m) => `“${m}”`).join(' and ');
  return `${pts} point — use ${words} from the lesson for the full point.`;
}
