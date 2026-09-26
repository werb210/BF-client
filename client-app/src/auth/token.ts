const STORAGE_KEY = "bf_jwt_token";
import { Capacitor } from "@capacitor/core";
import { credentialStore } from "./credentialStore";
let token: string | null = null;

// BF_CLIENT_TOKEN_WRITE_ORDER_v350 - Keychain writes used to be fire-and-forget,
// so "sign out, then sign in" could let the background clear land after the new
// token's write and wipe it; the next launch then restored nothing or a stale
// session. Every native write now runs in call order, one at a time, and a failed write
// never blocks the ones after it.
let pendingWrite: Promise<void> = Promise.resolve();
// Bumped on every set/clear so a slow hydrate never overwrites a newer session.
let tokenGeneration = 0;

function queueCredentialWrite(op: () => Promise<void>, failureMessage: string): void {
  // Web writes are synchronous localStorage calls and getToken() reads localStorage
  // directly, so delaying them would briefly resurrect a cleared token. Only the
  // native Keychain bridge is asynchronous, so only it is queued.
  if (!Capacitor.isNativePlatform()) {
    void op().catch((error) => {
      console.error(failureMessage, error);
    });
    return;
  }
  pendingWrite = pendingWrite
    .then(op)
    .catch((error) => {
      console.error(failureMessage, error);
    });
}

/** Resolves once every queued Keychain write has finished (or failed). */
export function flushTokenWrites(): Promise<void> {
  return pendingWrite;
}

export async function hydrateToken(): Promise<void> {
  const generation = tokenGeneration;
  await pendingWrite;
  const stored = await credentialStore.get();
  if (generation === tokenGeneration) token = stored;
}

export function getToken(): string | null {
  if (token) return token;
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === "undefined") return null;
  // BF_CLIENT_BLOCK_v865_STORAGE_SAFE — getToken() is called by the API client
  // on EVERY request, including the submit POST. Blocked localStorage must not
  // throw here, or submission dies before the request is even sent. Fall back to
  // the in-memory token captured during this session's OTP login.
  try {
    // Migrate legacy "auth_token" key on first read
    const legacy = localStorage.getItem("auth_token");
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem("auth_token");
      token = legacy;
      return token;
    }
    token = localStorage.getItem(STORAGE_KEY);
    return token;
  } catch {
    return token;
  }
}

export function setToken(t: string): void {
  token = t;
  tokenGeneration += 1;
  queueCredentialWrite(() => credentialStore.set(t), "Secure credential persistence failed");
  if (Capacitor.isNativePlatform()) return;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, t);
      localStorage.removeItem("auth_token"); // clean up legacy key
    } catch {
      /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE — token kept in-memory for the session */
    }
  }
}

export function clearToken(): void {
  token = null;
  void import("@/native/appBadge").then((m) => m.clearAppBadge()).catch((): void => undefined); // BF_CLIENT_BLOCK_v553_APP_BADGE
  tokenGeneration += 1;
  queueCredentialWrite(() => credentialStore.clear(), "Secure credential clear failed");
  if (Capacitor.isNativePlatform()) return;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("auth_token");
    } catch {
      /* BF_CLIENT_BLOCK_v865_STORAGE_SAFE */
    }
  }
}
