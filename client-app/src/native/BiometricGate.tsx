import { useEffect, type ReactNode } from "react";
import { useBiometricLock } from "./useBiometricLock";

// BF_CLIENT_BIOMETRIC_LOCK_v1 - full-screen unlock overlay shown while the
// session is biometric-locked. Renders children unchanged when unlocked.
export function BiometricGate({ children }: { children: ReactNode }) {
  const { locked, unlock } = useBiometricLock();
  useEffect(() => { if (locked) void unlock(); }, [locked, unlock]);
  if (!locked) return <>{children}</>;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0b1f3a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Boreal Financial is locked</div>
      <div style={{ fontSize: 14, opacity: 0.8 }}>Verify your identity to continue.</div>
      <button type="button" onClick={() => void unlock()} style={{ marginTop: 8, padding: "12px 20px", borderRadius: 8, border: "none", background: "#c9a227", color: "#0b1f3a", fontWeight: 700, cursor: "pointer" }}>
        Unlock
      </button>
    </div>
  );
}

export default BiometricGate;
