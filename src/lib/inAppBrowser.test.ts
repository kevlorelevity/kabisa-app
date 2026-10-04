import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, detectInApp } from './inAppBrowser';

const UA = {
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.40.92',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-A145F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/460.0.0.48.109;]',
  linkedinIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29',
  genericAndroidWebView:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
};

describe('detectInApp', () => {
  it('flags apps’ built-in browsers', () => {
    expect(detectInApp(UA.instagramIos)).toMatchObject({ inApp: true, app: 'Instagram', ios: true });
    expect(detectInApp(UA.facebookAndroid)).toMatchObject({ inApp: true, app: 'Facebook', android: true });
    expect(detectInApp(UA.linkedinIos)).toMatchObject({ inApp: true, app: 'LinkedIn' });
    expect(detectInApp(UA.genericAndroidWebView)).toMatchObject({ inApp: true, app: null });
  });

  it('leaves real browsers alone', () => {
    for (const ua of [UA.safariIos, UA.chromeIos, UA.chromeAndroid, UA.chromeMac]) {
      expect(detectInApp(ua).inApp).toBe(false);
    }
  });

  it('builds an Android intent that opens the same page in Chrome', () => {
    expect(chromeIntentUrl('https://kabisa.app/lesson/x?y=1')).toBe(
      'intent://kabisa.app/lesson/x?y=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fkabisa.app%2Flesson%2Fx%3Fy%3D1;end',
    );
  });
});
