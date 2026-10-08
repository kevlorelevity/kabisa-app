// -------- Voiceover --------
//
// Every Swahili phrase can be played aloud. Primary source is /api/tts — a
// Vercel function that synthesizes the phrase with ElevenLabs (or Azure's
// sw-KE voices as a fallback) and lets the CDN cache it forever. If that isn't
// available (local `npm run dev`, no key configured), we fall back to
// the device's own speech engine when it has a Swahili voice, and otherwise
// report "unavailable" so the button can say so.

export type Voice = 'male' | 'female';

const API = '/api/tts';
/** After the API fails, wait this long before trying it again. */
const API_RETRY_MS = 60_000;

let apiDownUntil = 0;
let current: HTMLAudioElement | null = null;
let voice: Voice = 'male';

export function setVoice(v: Voice): void {
  voice = v;
}

export function normalizeTtsText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function ttsUrl(text: string, v: Voice = voice): string {
  return `${API}?v=2&voice=${v}&text=${encodeURIComponent(normalizeTtsText(text))}`;
}

export function stopSpeaking(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function swahiliDeviceVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^sw[-_]KE/i.test(v.lang)) ??
    voices.find((v) => /^sw\b|^sw[-_]/i.test(v.lang)) ??
    null
  );
}

function speakOnDevice(text: string, onEnd: () => void): boolean {
  const v = swahiliDeviceVoice();
  if (!v) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

/**
 * Plays `text`. Resolves true once playback starts, false if no voice is
 * available. `onEnd` fires when playback finishes (or is interrupted).
 */
export async function speak(text: string, onEnd: () => void = () => {}): Promise<boolean> {
  stopSpeaking();
  const clean = normalizeTtsText(text);
  if (!clean) return false;

  if (Date.now() >= apiDownUntil && typeof Audio !== 'undefined') {
    const audio = new Audio(ttsUrl(clean));
    current = audio;
    audio.onended = () => {
      if (current === audio) current = null;
      onEnd();
    };
    try {
      await audio.play();
      return true;
    } catch (err) {
      // A user-initiated stop (pause during load) isn't an outage.
      if (err instanceof DOMException && err.name === 'AbortError') return true;
      apiDownUntil = Date.now() + API_RETRY_MS;
      if (current === audio) current = null;
    }
  }
  return speakOnDevice(clean, onEnd);
}
