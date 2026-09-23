// BF_CLIENT_APPLICATION_TOKEN_SECURE_v423
// bf_application_token was written straight to localStorage from five files. On a
// native build that is UserDefaults: unencrypted and present in device backups.
// It is a bearer credential for an entire loan application, so it belongs in the
// Keychain alongside the session JWT. Same write-ordering discipline as
// auth/token.ts - queued so a clear can never land after a newer set.
import { Capacitor } from "@capacitor/core";
import { namedCredentialStore } from "./credentialStore";

export const APPLICATION_TOKEN_KEY = "bf_application_token";

let cached: string | null = null;
let pendingWrite: Promise<void> = Promise.resolve();
let generation = 0;

function queue(op: () => Promise<void>, failureMessage: string): void {
  if (!Capacitor.isNativePlatform()) return;
  pendingWrite = pendingWrite.then(op).catch((error) => {
    console.error(failureMessage, error);
  });
}

/** Resolves once every queued Keychain write has finished (or failed). */
export function flushApplicationTokenWrites(): Promise<void> {
  return pendingWrite;
}

/** Pull the Keychain copy into memory at boot, before anything reads it. */
export async function hydrateApplicationToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const g = generation;
  await pendingWrite;
  const stored = await namedCredentialStore.get(APPLICATION_TOKEN_KEY);
  if (g === generation && stored) cached = stored;
}

export function getApplicationToken(): string | null {
  if (Capacitor.isNativePlatform()) return cached;
  if (typeof window === "undefined") return null;
  try {
    cached = window.localStorage.getItem(APPLICATION_TOKEN_KEY);
    return cached;
  } catch {
    return cached;
  }
}

export function setApplicationToken(value: string): void {
  const token = String(value ?? "").trim();
  if (!token) return;
  cached = token;
  generation += 1;
  queue(() => namedCredentialStore.set(APPLICATION_TOKEN_KEY, token), "Secure application-token write failed");
  if (Capacitor.isNativePlatform()) return;
  try {
    window.localStorage.setItem(APPLICATION_TOKEN_KEY, token);
  } catch {
    /* blocked storage - token kept in memory for this session */
  }
}

export function clearApplicationToken(): void {
  cached = null;
  generation += 1;
  queue(() => namedCredentialStore.clear(APPLICATION_TOKEN_KEY), "Secure application-token clear failed");
  if (Capacitor.isNativePlatform()) return;
  try {
    window.localStorage.removeItem(APPLICATION_TOKEN_KEY);
  } catch {
    /* storage may be blocked */
  }
}
