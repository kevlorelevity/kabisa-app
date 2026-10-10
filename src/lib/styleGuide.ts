// -------- The editors' style guide, built in the background --------
//
// Every Context note, learner note and Sanifu an editor saves is kept as an observation
// (admin_guidance). In the background, Claude condenses all active observations into one short
// style guide (style_guide, api/style-guide.ts). Every AI edit reads the latest guide plus any
// observations made since it was written. Shared by the API functions; no imports.

export interface Observation {
  text: string;
  kind?: string | null;
  lesson_id?: string | null;
  target_label?: string | null;
  created_at?: string;
}

type Rest = (path: string) => Promise<Response>;

/** The latest guide + observations newer than it, ready for a prompt (oldest first). */
export async function loadGuidance(rest: Rest): Promise<Array<{ text: string; target_label?: string | null; lesson_id?: string | null }>> {
  const gRes = await rest('style_guide?select=text,created_at&order=created_at.desc&limit=1');
  const guide = gRes.ok ? ((await gRes.json()) as Array<{ text: string; created_at: string }>)[0] : undefined;
  const since = guide ? `&created_at=gt.${encodeURIComponent(guide.created_at)}` : '';
  const oRes = await rest(`admin_guidance?select=text,target_label,lesson_id&active=eq.true${since}&order=created_at.desc&limit=80`);
  const fresh = oRes.ok ? ((await oRes.json()) as Observation[]).reverse() : [];
  return [...(guide ? [{ text: `Style guide (condensed from all earlier editor notes):\n${guide.text}` }] : []), ...fresh];
}

export const STYLE_GUIDE_SYSTEM = `You maintain the style guide of Kabisa, an app that teaches spoken KENYAN Swahili (the way Nairobi speaks) to foreigners living in Kenya. The guide is read by an AI that edits lessons, so it must be precise and compact.

You get the editors' observations: the context they gave for an edit, learner notes they wrote, and Sanifu (standard Swahili) forms they set for Kenyan words. Turn them into general, reusable rules:
- Group by theme with short markdown headings (e.g. "Kenyan vs Sanifu", "Words Kenyans prefer", "Time & numbers", "Tone & register").
- One bullet per rule, with a Swahili example where helpful: "Use ama, not au (au is Sanifu)".
- Merge duplicates; when observations conflict, the newer one wins.
- Keep distinctions exact (e.g. saa moja = 7 a.m. Swahili time; lisaa limoja = one hour duration).
- A single word's note or Sanifu becomes a rule only if it generalises or is worth remembering as vocabulary guidance; otherwise list it briefly under "Word notes".
- No preamble, no commentary — just the guide. Keep it under 1,500 words.`;

export function buildStyleGuidePrompt(observations: Observation[], previous?: string): string {
  const lines = observations.map((o) => `- [${o.kind ?? 'rule'}${o.lesson_id ? ` · ${o.lesson_id}` : ''}${o.target_label ? ` · ${o.target_label}` : ''}] ${o.text}`);
  return [
    previous ? `Current guide (rewrite it, keeping what still holds):\n${previous}\n` : '',
    `All active observations, oldest first (${observations.length}):`,
    ...lines,
    '',
    'Write the complete new style guide.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Observation texts for what an editor saved in the ✎ modal. */
export function contextObservation(ctx: string, changes: Array<{ before: string; after: string }>): string {
  const what = changes
    .filter((c) => c.before.trim() || c.after.trim())
    .slice(0, 3)
    .map((c) => `"${c.before}" → "${c.after}"`)
    .join('; ');
  return what ? `${ctx} (edit: ${what})` : ctx;
}

export function noteObservation(subject: string, note: string): string {
  return `Learner note on "${subject}": ${note}`;
}

export function sanifuObservation(subject: string, sanifu: string): string {
  return `Kenyan "${subject}" — Sanifu (standard) form: "${sanifu}"`;
}
