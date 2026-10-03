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
