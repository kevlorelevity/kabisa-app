// Google refuses to sign people in from apps' built-in browsers (Instagram,
// Facebook, LinkedIn, TikTok…) and its pop-up often stays blank there. Detect
// them so we can ask the learner to open Kabisa in their real browser instead.

export type InAppInfo = { inApp: boolean; app: string | null; android: boolean; ios: boolean };

const APPS: Array<[RegExp, string]> = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS|MessengerForiOS|\bFB4A\b/i, 'Facebook'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/musical_ly|TikTok|BytedanceWebview/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/Twitter|TwitterAndroid/i, 'X'],
  [/Pinterest/i, 'Pinterest'],
  [/\bLine\//i, 'LINE'],
  [/WhatsApp/i, 'WhatsApp'],
  [/GSA\//i, 'the Google app'],
];

export function detectInApp(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InAppInfo {
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const hit = APPS.find(([re]) => re.test(ua));
  // Generic embedded browsers: Android WebView marks itself "; wv)"; iOS
  // WKWebView lacks the "Safari/" token that Safari and Chrome/Firefox on iOS send.
  const androidWebView = android && /; wv\)/.test(ua);
  const iosWebView = ios && !/Safari\//.test(ua);
  const inApp = Boolean(hit) || androidWebView || iosWebView;
  return { inApp, app: hit?.[1] ?? null, android, ios };
}

/** Android: a link that asks the system to open this page in Chrome. */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
