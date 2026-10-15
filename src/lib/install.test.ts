import { afterEach, describe, expect, it } from 'vitest';
import { DISMISS_FOR_MS, dismissInstallCard, installCardDismissed, installPlatform } from './install';
import { detectInApp } from './inAppBrowser';

const UA = {
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1',
  firefoxIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15',
  homeScreenIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadOs: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
};

describe('installPlatform', () => {
  it('tells iPhone browsers apart', () => {
    expect(installPlatform(UA.safariIos, 5)).toBe('ios-safari');
    expect(installPlatform(UA.chromeIos, 5)).toBe('ios-chrome');
    expect(installPlatform(UA.firefoxIos, 5)).toBe('ios-other');
  });
  it('spots iPads that pretend to be Macs', () => {
    expect(installPlatform(UA.ipadOs, 5)).toBe('ios-safari');
    expect(installPlatform(UA.chromeMac, 0)).toBe('desktop');
  });
  it('recognises Android', () => {
    expect(installPlatform(UA.chromeAndroid, 5)).toBe('android');
  });
});

describe('home-screen app vs in-app browsers', () => {
  it('does not mistake Kabisa on the iPhone home screen for an in-app browser', () => {
    expect(detectInApp(UA.homeScreenIos, true).inApp).toBe(false);
    expect(detectInApp(UA.homeScreenIos, false).inApp).toBe(true); // same UA inside another app's browser
  });
});

describe('install card snooze', () => {
  afterEach(() => localStorage.clear());
  it('stays away for two weeks after "Not now"', () => {
    const t = 1_800_000_000_000;
    expect(installCardDismissed(t)).toBe(false);
    dismissInstallCard(t);
    expect(installCardDismissed(t + 1000)).toBe(true);
    expect(installCardDismissed(t + DISMISS_FOR_MS + 1)).toBe(false);
  });
});
