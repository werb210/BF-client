// BF_CLIENT_FACE_ID_SETTING_v325
// The visible, permanent way to turn Face ID sign-in on and off.
//
// What went wrong before: v297 offered enrollment exactly once, through a
// window.confirm fired straight after the OTP verify, and marked the device as
// asked BEFORE reading the answer. WKWebView blocks that dialog often enough
// that most devices never saw it, and the flag meant they could never see it
// again. v324 added a toggle but rendered it only when
// Capacitor.isNativePlatform() AND checkBiometry().isAvailable were both true,
// so any failure in the plugin showed nothing at all and left no way to tell
// why.
//
// This row therefore ALWAYS renders inside the native app. When Face ID cannot
// be used it says so, with the reason the plugin gave, instead of disappearing.
import { useCallback, useEffect, useState } from "react";
import { A11Y_COLORS } from "@/styles/a11yColors"; // BF_CLIENT_v789_CONTRAST
import {
  biometryStatus,
  disableDeviceSignIn,
  enrollDeviceWithReason,
  HINT_KEY,
  isEnrolled,
  type BiometryStatus,
} from "@/native/deviceSignIn";
import { Icon } from "@/components/cmp/icons"; // BF_CLIENT_v805_PHONE_FIXES

type Phase = "checking" | "ready";

export default function FaceIdSignInToggle({ variant }: { variant?: "row" } = {}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [status, setStatus] = useState<BiometryStatus | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(false);

  const refresh = useCallback(async () => {
    const s = await biometryStatus();
    setStatus(s);
    setEnrolled(s.native ? await isEnrolled().catch(() => false) : false);
    setPhase("ready");
  }, []);

  useEffect(() => {
    try { setHint(sessionStorage.getItem(HINT_KEY) === "1"); } catch { /* storage unavailable */ }
    void refresh();
  }, [refresh]);

  const clearHint = () => {
    setHint(false);
    try { sessionStorage.removeItem(HINT_KEY); } catch { /* storage unavailable */ }
  };

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      // BF_CLIENT_ENROLL_REASON_v335 - show the actual reason. A cancelled
      // prompt carries no message, because choosing "Not now" is not an error.
      const result = await enrollDeviceWithReason();
      if (result.ok === false && result.message) setError(result.message);
      await refresh();
      clearHint();
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      await disableDeviceSignIn();
      await refresh();
      clearHint();
    } catch {
      setError("Face ID could not be turned off. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Face ID is a device feature; there is nothing to offer in a browser tab.
  if (phase === "ready" && status && !status.native) return null;

  // BF_CLIENT_v805_PHONE_FIXES - in Settings and the account sheet: a settings row with an on/off switch.
  if (variant === "row") {
    const available = phase === "ready" && Boolean(status?.available);
    const desc = phase === "checking" ? "Checking..."
      : !available ? `Not available - ${status?.reason ?? "this device can't use Face ID"}`
      : busy ? (enrolled ? "Turning off..." : "Turning on...")
      : enrolled ? "On. Sign in with your face instead of a text code."
      : hint ? "Skip the text code next time." : "Sign in with your face instead of a text code.";
    return (
      <div className="cmpx-row cmpx-row--static" data-testid="face-id-setting">
        <span className="cmpx-row__icon"><Icon name="user" /></span>
        <span className="cmpx-row__text">
          <span className="cmpx-row__title" id="face-id-title">Face ID sign-in</span>
          <span className="cmpx-row__desc" data-testid={available ? undefined : phase === "ready" ? "face-id-unavailable" : undefined}>{desc}</span>
          {error ? <span className="cmpx-row__desc" role="alert" style={{ color: "#b91c1c" }}>{error}</span> : null}
        </span>
        <button type="button" role="switch" className="cmpx-switch" aria-checked={enrolled} aria-labelledby="face-id-title"
          data-testid="face-id-switch" disabled={!available || busy}
          onClick={() => void (enrolled ? turnOff() : turnOn())}>
          <span aria-hidden="true" />
        </button>
      </div>
    );
  }

  const row: React.CSSProperties = {
    marginTop: 12,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };
  const button: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    // BF_CLIENT_v789_CONTRAST - the busy state was white on #94a3b8 (2.6:1).
    border: `1px solid ${busy ? A11Y_COLORS.faceIdBusyBg : "#1e3a5f"}`,
    background: busy ? A11Y_COLORS.faceIdBusyBg : "#1e3a5f",
    color: busy ? A11Y_COLORS.faceIdBusyText : "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: busy ? "default" : "pointer",
  };
  const link: React.CSSProperties = {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#1e3a5f",
    fontSize: 14,
    textDecoration: "underline",
    cursor: busy ? "default" : "pointer",
  };

  return (
    <div style={row} data-testid="face-id-setting">
      <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>Face ID sign-in</span>

      {phase === "checking" && <span style={{ fontSize: 13, color: "#64748b" }}>Checking…</span>}

      {phase === "ready" && status && !status.available && (
        <span style={{ fontSize: 13, color: "#64748b" }} data-testid="face-id-unavailable">
          Not available — {status.reason}
        </span>
      )}

      {phase === "ready" && status?.available && !enrolled && (
        <>
          <button type="button" style={button} disabled={busy} onClick={() => void turnOn()}>
            {busy ? "Turning on…" : "Turn on Face ID sign-in"}
          </button>
          {hint && (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Skip the text code next time.
            </span>
          )}
        </>
      )}

      {phase === "ready" && status?.available && enrolled && (
        <>
          <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>On</span>
          <button type="button" style={link} disabled={busy} onClick={() => void turnOff()}>
            {busy ? "Turning off…" : "Turn off"}
          </button>
        </>
      )}

      {error && <span style={{ fontSize: 13, color: "#b91c1c", width: "100%" }}>{error}</span>}
    </div>
  );
}
