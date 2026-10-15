import { useEffect, useState } from 'react';

// -------- "Add to Home Screen" --------
//
// Android (Chrome, Edge, Samsung Internet) fires `beforeinstallprompt`; we keep the event so
// our own button can open the real install dialog. iPhones have no such API: Safari (and
// Chrome on iOS 16.4+) only offer Share → "Add to Home Screen", so there we show a guide.

export type InstallPlatform = 'ios-safari' | 'ios-chrome' | 'ios-other' | 'android' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const INSTALL_CHANGED_EVENT = 'ksa:install-changed';
export const OPEN_INSTALL_EVENT = 'ksa:open-install';
const DISMISS_KEY = 'ksa_install_dismissed';
const INSTALLED_KEY = 'ksa_installed';
/** After "Not now", the card stays away this long. */
export const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;

function announce() {
  window.dispatchEvent(new Event(INSTALL_CHANGED_EVENT));
}

/** Call once at startup, before React renders, so an early `beforeinstallprompt` isn't missed. */
export function initInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of Chrome's mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    announce();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    try {
      localStorage.setItem(INSTALLED_KEY, '1');
    } catch {
      /* ignore */
    }
    announce();
  });
}

/** Running from the home screen (iOS `navigator.standalone`, or display-mode standalone elsewhere). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch {
    return false;
  }
}

export function installPlatform(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '', maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0): InstallPlatform {
  // iPadOS reports itself as a Mac; touch support gives it away.
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  if (ios) {
    if (/CriOS/i.test(ua)) return 'ios-chrome';
    if (/FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|GSA\//i.test(ua) || !/Safari\//i.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Opens the browser's own install dialog (Android/desktop Chrome). Resolves true if accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  announce();
  return outcome === 'accepted';
}

export function wasInstalled(): boolean {
  if (justInstalled) return true;
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallCard(now = Date.now()): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    /* ignore */
  }
  announce();
}

export function installCardDismissed(now = Date.now()): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(t) && now - t < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/** Can this learner add Kabisa to their home screen from where they are right now? */
export function installSupported(platform: InstallPlatform = installPlatform()): boolean {
  if (isStandalone()) return false;
  if (platform === 'ios-safari' || platform === 'ios-chrome') return true;
  return canPromptInstall();
}

export function openInstallGuide(): void {
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
}

/** Re-render when install availability changes. */
export function useInstallState(): { supported: boolean; platform: InstallPlatform; standalone: boolean } {
  const [, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    window.addEventListener(INSTALL_CHANGED_EVENT, bump);
    return () => window.removeEventListener(INSTALL_CHANGED_EVENT, bump);
  }, []);
  const platform = installPlatform();
  return { supported: installSupported(platform), platform, standalone: isStandalone() };
}

/** Production only: register the service worker that makes Kabisa installable and work offline. */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[sw] registration failed', err));
  });
}
