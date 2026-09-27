// BF_CLIENT_BLOCK_v600 - a browser-only account-bar action for passkey enrollment.
import { useState } from "react";
import { createPasskey, PasskeyError, passkeysSupported } from "@/auth/passkeys";

export default function PasskeySignInToggle() {
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!passkeysSupported()) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      await createPasskey();
      setCreated(true);
    } catch (cause) {
      setError(cause instanceof PasskeyError ? cause.message : "Your passkey could not be created. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="passkey-setting" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>Passkey sign-in</span>
      {created ? (
        <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>Ready</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void turnOn()}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #1e3a5f", background: busy ? "#94a3b8" : "#1e3a5f", color: "#fff", fontSize: 14, fontWeight: 600 }}
        >
          {busy ? "Creating…" : "Create a passkey"}
        </button>
      )}
      {error && <span style={{ fontSize: 13, color: "#b91c1c", width: "100%" }}>{error}</span>}
    </div>
  );
}
