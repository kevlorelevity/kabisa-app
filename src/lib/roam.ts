import { useSyncExternalStore } from 'react';

// "Roam" — an admin-only mode that opens every lesson regardless of scores,
// so admins can move freely through the whole course. It never changes the
// learner's real progress: scores, XP and levels are recorded as usual.
//
// Two switches must both be on: `allowed` (the signed-in account is an admin,
// set by AdminProvider) and `enabled` (the admin's own choice, remembered in
// localStorage on this device).

const KEY = 'ksa_roam';
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let enabled = readEnabled();
let allowed = false;

function emit() {
  listeners.forEach((l) => l());
}

/** True when the current admin has Roam switched on. */
export function isRoaming(): boolean {
  return allowed && enabled;
}

/** Called by AdminProvider whenever the admin flag for the signed-in account changes. */
export function setRoamAllowed(value: boolean): void {
  if (allowed === value) return;
  allowed = value;
  emit();
}

export function setRoaming(value: boolean): void {
  enabled = value;
  try {
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked — still works for this session */
  }
  emit();
}

/** Subscribes a component to Roam changes; returns whether Roam is active. */
export function useRoam(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isRoaming,
  );
}
