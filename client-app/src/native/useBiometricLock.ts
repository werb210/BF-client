import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

// BF_CLIENT_BIOMETRIC_LOCK_v1 - require Face ID / Touch ID to re-enter an
// already-authenticated session on native. Never locks out devices without
// biometry, and never affects web or logged-out users.
const SESSION_KEY = "bf_jwt_token";

function hasSession(): boolean {
  try { return !!window.localStorage.getItem(SESSION_KEY); } catch { return false; }
}

export function useBiometricLock() {
  const [locked, setLocked] = useState(false);
  const [available, setAvailable] = useState(false);

  const evaluate = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !hasSession()) { setLocked(false); return; }
    try {
      const info = await BiometricAuth.checkBiometry();
      if (info.isAvailable) { setAvailable(true); setLocked(true); }
      else { setAvailable(false); setLocked(false); }
    } catch { setLocked(false); }
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
    window.addEventListener("boreal:native-resume", onResume);
    return () => window.removeEventListener("boreal:native-resume", onResume);
  }, [evaluate]);

  return { locked, available, unlock };
}
