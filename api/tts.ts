// Vercel serverless function: GET /api/tts?text=...&voice=male|female
//
// Synthesizes a Kenyan Swahili phrase and returns MP3. Responses are cached
// at Vercel's CDN for a year, so each phrase is synthesized (and paid for) once.
//
// Provider 1 — ElevenLabs (preferred). Env vars (Vercel → Project → Settings →
// Environment Variables):
//   ELEVENLABS_API_KEY          — API key (elevenlabs.io → Developers → API keys)
//   ELEVENLABS_VOICE_ID         — voice used for every line, or per voice:
//   ELEVENLABS_VOICE_ID_MALE / ELEVENLABS_VOICE_ID_FEMALE
//   ELEVENLABS_MODEL (optional) — defaults to eleven_v3, the first ElevenLabs
//                                  model that supports Swahili
// Provider 2 — Azure AI Speech (fallback, sw-KE neural voices):
//   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
//
// Abuse guard: only text that appears in the bundled lesson content
// (content/lessons/*.json) can be synthesized, so the endpoint can't be used
// as a free general-purpose TTS proxy.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const VOICES: Record<string, string> = {
  male: 'sw-KE-RafikiNeural',
  female: 'sw-KE-ZuriNeural',
};
const MAX_CHARS = 300;

function canon(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let corpus: string[] | null = null;

/** Every Swahili string in the lessons, canonicalized. */
function loadCorpus(): string[] {
  if (corpus) return corpus;
  const dir = join(process.cwd(), 'content', 'lessons');
  const lines: string[] = [];
  const collect = (v: unknown, key = ''): void => {
    if (typeof v === 'string') {
      if (['swahili', 'sanifu', 'text', 'form', 'before', 'after'].includes(key)) lines.push(v);
      return;
    }
    if (Array.isArray(v)) v.forEach((x) => collect(x, key));
    else if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      // Practice items: also add the full sentence with the gap filled in.
      if (Array.isArray(obj.options) && typeof obj.before === 'string') {
        const right = (obj.options as Array<{ text?: string; correct?: boolean }>).find((o) => o.correct);
        if (right?.text) lines.push(`${obj.before}${right.text}${obj.after ?? ''}`);
      }
      for (const [k, x] of Object.entries(obj)) collect(x, k);
    }
  };
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    collect(JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }
  corpus = lines.map(canon).filter(Boolean);
  return corpus;
}

// Lessons are personalised at runtime: the scripts' "John", "Uganda" and
// "Kampala" become the learner's own name, country and home city. In those
// lines a slot word may stand for 1–3 words of the requested text.
const SLOTS = new Set(['john', 'uganda', 'kampala']);
let templates: string[][] | null = null;

function loadTemplates(): string[][] {
  if (templates) return templates;
  templates = loadCorpus()
    .map((line) => line.split(' '))
    .filter((toks) => toks.some((w) => SLOTS.has(w)));
  return templates;
}

/** Does `q` (tokens) occur as a contiguous span of `line`, letting slot words absorb 1–3 tokens? */
function spanMatches(q: string[], line: string[]): boolean {
  const from = (qi: number, li: number): boolean => {
    if (qi === q.length) return true;
    if (li >= line.length) return false;
    const w = line[li];
    if (SLOTS.has(w)) {
      for (let n = 1; n <= 3 && qi + n <= q.length; n++) if (from(qi + n, li + 1)) return true;
      return false;
    }
    return q[qi] === w && from(qi + 1, li + 1);
  };
  for (let start = 0; start < line.length; start++) if (from(0, start)) return true;
  return false;
}

function isAllowed(text: string): boolean {
  const t = canon(text);
  if (!t) return false;
  if (loadCorpus().some((line) => line === t || ` ${line} `.includes(` ${t} `))) return true;
  const q = t.split(' ');
  return loadTemplates().some((line) => spanMatches(q, line));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function mp3(body: ArrayBuffer): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
}

async function elevenLabs(text: string, apiKey: string, voiceId: string): Promise<Response> {
  const model = process.env.ELEVENLABS_MODEL || 'eleven_v3';
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: model }),
    },
  );
  if (!res.ok) {
    console.error('[tts] ElevenLabs error', res.status, await res.text().catch(() => ''));
    return json(502, { error: 'tts_upstream', provider: 'elevenlabs', status: res.status });
  }
  return mp3(await res.arrayBuffer());
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const text = (url.searchParams.get('text') ?? '').trim().replace(/\s+/g, ' ');
  const voice = VOICES[url.searchParams.get('voice') ?? 'male'] ?? VOICES.male;

  if (!text || text.length > MAX_CHARS) return json(400, { error: 'bad_text' });
  if (!isAllowed(text)) return json(403, { error: 'not_in_lessons' });

  const which = url.searchParams.get('voice') === 'female' ? 'female' : 'male';
  const elKey = process.env.ELEVENLABS_API_KEY;
  const elVoice =
    (which === 'female' ? process.env.ELEVENLABS_VOICE_ID_FEMALE : process.env.ELEVENLABS_VOICE_ID_MALE) ??
    process.env.ELEVENLABS_VOICE_ID;
  if (elKey && elVoice) return elevenLabs(text, elKey, elVoice);

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return json(503, { error: 'tts_not_configured' });

  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="sw-KE">` +
    `<voice name="${voice}"><prosody rate="-8%">${escapeXml(text)}</prosody></voice></speak>`;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kabisa',
    },
    body: ssml,
  });

  if (!res.ok) {
    console.error('[tts] Azure error', res.status, await res.text().catch(() => ''));
    return json(502, { error: 'tts_upstream', status: res.status });
  }

  return mp3(await res.arrayBuffer());
}
