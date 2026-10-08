import { describe, expect, it } from 'vitest';
import { GET } from '../api/tts';

const call = (text: string) => GET(new Request(`http://x/api/tts?text=${encodeURIComponent(text)}`));

describe('api/tts allow-list', () => {
  it('accepts lesson text, including personalised names and countries', async () => {
    expect((await call('Ninatoka Uganda, asante.')).status).toBe(503); // allowed, TTS not configured in tests
    expect((await call('Ninatoka Falme za Kiarabu, asante.')).status).toBe(503);
    expect((await call('Jina yangu ni Amani.')).status).toBe(503);
    expect((await call('Ninatoka Ujerumani')).status).toBe(503);
  });

  it('rejects text that is not in the lessons', async () => {
    expect((await call('Hii ni sentensi ya bure kabisa ambayo haipo')).status).toBe(403);
  });
});

describe('api/tts ElevenLabs', () => {
  it('uses ElevenLabs (eleven_v3) when a key and voice are configured', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    vi.stubEnv('ELEVENLABS_VOICE_ID', 'voice123');
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const res = await call('Ninatoka Uganda, asante.');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('audio/mpeg');
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/v1/text-to-speech/voice123');
      expect(JSON.parse(String(init.body))).toMatchObject({ text: 'Ninatoka Uganda, asante.', model_id: 'eleven_v3' });
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });
});
