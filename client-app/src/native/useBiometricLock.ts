import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { clearToken, getToken, hydrateToken } from "@/auth/token"; // BF_CLIENT_FACE_ID_SIGN_IN_v297
import { ENV } from "@/env";
import { isEnrolled, renewSessionSilently } from "@/native/deviceSignIn";

// BF_CLIENT_BIOMETRIC_LOCK_v1 - require Face ID / Touch ID to re-enter an
// already-authenticated session on native. Never locks out devices without
// biometry, and never affects web or logged-out users.
//
// BF_CLIENT_LOCK_LOOP_FIX_v312 - lock on a cold start, or after a minute away;
// never because of the Face ID prompt's own inactive/active bounce.
//
// BF_CLIENT_LOCK_SESSION_CHECK_v322 - the lock asked for Face ID over a session
// that was already dead (expired, or refused by the server - for example a
// token left in the Keychain by an earlier install, which survives deleting the
// app), then the first screen bounced to the text-code page. Now:
//   - a dead session with no Face ID sign-in is cleared and never locked: the
//     client goes straight to sign-in, with no pointless Face ID prompt;
//   - with Face ID sign-in turned on, a successful unlock also renews the
//     session silently, so the client lands in the app, not on the code page.
const SESSION_KEY = "bf_jwt_token";
export const LOCK_AFTER_MS = 60_000;

function hasSession(): boolean {
  if (getToken()) return true;
  try { return !!window.localStorage.getItem(SESSION_KEY); } catch { return false; }
}

export function tokenExpired(token: string | null, now = Date.now()): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= now;
  } catch {
    return true;
  }
}

/** true = the server accepts the session, false = it refuses it, null = could not tell (offline). */
export async function sessionAccepted(token: string | null, apiBase: string, timeoutMs = 5000): Promise<boolean | null> {
  if (!token) return false;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${apiBase}/api/client/applications`, { headers: { Authorization: `Bearer ${token}` }, signal: controller?.signal });
    if (res.status === 401 || res.status === 403) return false;
    return true;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function shouldLock(p: { session: boolean; sessionUsable?: boolean; enrolled?: boolean; biometry: boolean; coldStart: boolean; backgroundedAt: number | null; now: number }): boolean {
  if (!p.session || !p.biometry) return false;
  if (p.sessionUsable === false && !p.enrolled) return false;
  if (p.coldStart) return true;
  return p.backgroundedAt !== null && p.now - p.backgroundedAt >= LOCK_AFTER_MS;
}

export function useBiometricLock() {
  const [locked, setLocked] = useState(false);
  const [available, setAvailable] = useState(false);
  const coldStart = useRef(true);
  const backgroundedAt = useRef<number | null>(null);

  const evaluate = useCallback(async () => {
    const isColdStart = coldStart.current;
    coldStart.current = false;
    const awayAt = backgroundedAt.current;
    backgroundedAt.current = null;
    if (!Capacitor.isNativePlatform()) { setLocked(false); return; }
    await hydrateToken().catch((): void => undefined);
    if (!hasSession()) return;
    let biometry = false;
    try { biometry = Boolean((await BiometricAuth.checkBiometry()).isAvailable); } catch { biometry = false; }
    setAvailable(biometry);
    const enrolled = await isEnrolled().catch(() => false);
    const token = getToken();
    let usable = !tokenExpired(token);
    if (usable && isColdStart) usable = (await sessionAccepted(token, ENV.API_BASE)) !== false;
    if (!usable && !enrolled) {
      clearToken(); // nothing to unlock: go straight to sign-in, no Face ID prompt
      return;
    }
    if (shouldLock({ session: true, sessionUsable: usable, enrolled, biometry, coldStart: isColdStart, backgroundedAt: awayAt, now: Date.now() })) setLocked(true);
  }, []);

  const unlock = useCallback(async () => {
    try {
      await BiometricAuth.authenticate({
        reason: "Unlock Boreal Financial",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use passcode",
      });
      // The client just passed Face ID: refresh the session so it cannot be dead underneath.
      if (await isEnrolled().catch(() => false)) await renewSessionSilently(ENV.API_BASE);
      setLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void evaluate();
    const onResume = () => { void evaluate(); };
    const onPause = () => { if (backgroundedAt.current === null) backgroundedAt.current = Date.now(); };
    window.addEventListener("boreal:native-resume", onResume);
    window.addEventListener("boreal:native-pause", onPause);
    return () => {
      window.removeEventListener("boreal:native-resume", onResume);
      window.removeEventListener("boreal:native-pause", onPause);
    };
  }, [evaluate]);

  return { locked, available, unlock };
}
