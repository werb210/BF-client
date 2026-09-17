import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { getToken, hydrateToken } from "@/auth/token"; // BF_CLIENT_FACE_ID_SIGN_IN_v297

// BF_CLIENT_BIOMETRIC_LOCK_v1 - require Face ID / Touch ID to re-enter an
// already-authenticated session on native. Never locks out devices without
// biometry, and never affects web or logged-out users.
//
// BF_CLIENT_LOCK_LOOP_FIX_v312 - the Face ID prompt itself makes iOS report the
// app as inactive and then active again. The lock re-checked on every return to
// active, so unlocking (or signing in with Face ID) immediately locked again:
// an endless Face ID loop. Now it locks on a cold start, or after the app has
// really been away for a minute - the same rule the dialer uses.
const SESSION_KEY = "bf_jwt_token";
export const LOCK_AFTER_MS = 60_000;

function hasSession(): boolean {
  // BF_CLIENT_FACE_ID_SIGN_IN_v297 - on the phone the session lives in secure storage, not localStorage.
  if (getToken()) return true;
  try { return !!window.localStorage.getItem(SESSION_KEY); } catch { return false; }
}

export function shouldLock(p: { session: boolean; biometry: boolean; coldStart: boolean; backgroundedAt: number | null; now: number }): boolean {
  if (!p.session || !p.biometry) return false;
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
    let biometry = false;
    try { biometry = Boolean((await BiometricAuth.checkBiometry()).isAvailable); } catch { biometry = false; }
    setAvailable(biometry);
    if (shouldLock({ session: hasSession(), biometry, coldStart: isColdStart, backgroundedAt: awayAt, now: Date.now() })) setLocked(true);
  }, []);

  const unlock = useCallback(async () => {
    try {
      await BiometricAuth.authenticate({
        reason: "Unlock Boreal Financial",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use passcode",
      });
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
