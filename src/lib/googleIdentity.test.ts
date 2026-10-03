import { describe, expect, it } from 'vitest';
import { gisSupportedHere, makeNonce } from './googleIdentity';

describe('googleIdentity', () => {
  it('uses Google’s own button only on origins registered with Google', () => {
    expect(gisSupportedHere('https://kabisa.app')).toBe(true);
    expect(gisSupportedHere('http://localhost:5173')).toBe(true);
    expect(gisSupportedHere('https://kabisa-git-feature-splotch-ai.vercel.app')).toBe(false);
  });

  it('hands Google the SHA-256 of the nonce Supabase will check', async () => {
    const { raw, hashed } = await makeNonce();
    expect(raw.length).toBeGreaterThan(20);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hashed).toBe(hex);
    expect((await makeNonce()).raw).not.toBe(raw);
  });
});
