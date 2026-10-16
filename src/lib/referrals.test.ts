import { beforeEach, describe, expect, it } from 'vitest';
import { captureReferralFromUrl, inviteMailto, pendingReferral, validEmails } from './referrals';

describe('invite a friend', () => {
  beforeEach(() => localStorage.clear());

  it('remembers ?ref= across the sign-in redirect and tidies the URL', () => {
    window.history.replaceState(null, '', '/?ref=ab12cd34&x=1');
    captureReferralFromUrl();
    expect(pendingReferral()).toBe('ab12cd34');
    expect(window.location.search).toBe('?x=1');
  });

  it('ignores junk codes', () => {
    window.history.replaceState(null, '', '/?ref=<script>');
    captureReferralFromUrl();
    expect(pendingReferral()).toBeNull();
  });

  it('writes the email with the personal link', () => {
    const m = inviteMailto('a@b.co, c@d.ke', 'Amani', 'https://kabisa.app/?ref=ab12cd34', 'Habari!');
    expect(m.startsWith('mailto:a@b.co,c@d.ke?subject=')).toBe(true);
    expect(decodeURIComponent(m)).toContain('Join me here: https://kabisa.app/?ref=ab12cd34');
    expect(decodeURIComponent(m)).toContain('Amani thinks you');
  });

  it('checks the addresses', () => {
    expect(validEmails('rafiki@example.com')).toBe(true);
    expect(validEmails('a@b.co; c@d.ke')).toBe(true);
    expect(validEmails('rafiki')).toBe(false);
    expect(validEmails('')).toBe(false);
  });
});
