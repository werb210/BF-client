// BF_CLIENT_ONE_SIGN_IN_v737 - Face ID (app) and passkey (browser) sign-in, moved here from the old stand-alone
// /otp page so the landing page is the one sign-in screen. Shows nothing when neither is available.
import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { resolveOtpNextStep } from "@/auth/otp";
import { ClientProfileStore } from "@/state/clientProfiles";
import { identifyClarity } from "@/utils/analytics";
import { biometryAvailable, isEnrolled, phoneFromToken, signInWithFaceId } from "@/native/deviceSignIn";
import { passkeysSupported, signInWithPasskey, PasskeyError } from "@/auth/passkeys";

export default function QuickSignIn() {
  const navigate = useNavigate();
  const [faceIdReady, setFaceIdReady] = useState(false);
  const [passkeyReady] = useState(passkeysSupported);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ready = (await biometryAvailable()) && (await isEnrolled());
      if (alive) setFaceIdReady(ready);
    })();
    return () => { alive = false; };
  }, []);

  function routeAfterSignIn(token: string, data: any) {
    const phone = phoneFromToken(token) ?? "";
    try { sessionStorage.setItem("verified_phone", phone); identifyClarity(phone); } catch { /* storage unavailable */ }
    const submittedId = typeof data?.submittedApplicationId === "string" ? data.submittedApplicationId : "";
    if (data?.hasSubmittedApplication === true && submittedId) {
      ClientProfileStore.markSubmitted(phone, submittedId);
      navigate("/application/" + submittedId, { replace: true });
      return;
    }
    const next = resolveOtpNextStep(ClientProfileStore.getProfile(phone));
    navigate(next.action === "portal" ? "/portal" : "/apply/step-1", { replace: true });
  }

  async function run(kind: "faceid" | "passkey") {
    setBusy(true);
    setError(null);
    try {
      const data = kind === "faceid" ? await signInWithFaceId() : await signInWithPasskey();
      routeAfterSignIn(data.token, data);
    } catch (e: any) {
      if (kind === "faceid") {
        if (e?.code === "expired" || e?.code === "not_enrolled") setFaceIdReady(false);
        setError(e?.code === "expired" || e?.code === "not_enrolled" ? e.message : "Face ID didn't work. Sign in with a text code instead.");
      } else {
        setError(e instanceof PasskeyError ? e.message : "Passkey sign-in didn't work. Sign in with a text code instead.");
      }
    } finally {
      setBusy(false);
    }
  }

  const showFaceId = faceIdReady;
  const showPasskey = passkeyReady && !faceIdReady;
  if (!showFaceId && !showPasskey) return null;
  const btn: CSSProperties = { width: "100%", minHeight: 48, borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: busy ? "default" : "pointer", marginBottom: 8 };
  return (
    <div data-testid="quick-sign-in" style={{ marginBottom: 14 }}>
      {showFaceId ? (
        <button type="button" data-testid="face-id-sign-in" disabled={busy} onClick={() => void run("faceid")}
          style={{ ...btn, border: 0, background: "#0B1F3A", color: "#fff" }}>{busy ? "Signing in..." : "Sign in with Face ID"}</button>
      ) : (
        <button type="button" data-testid="passkey-sign-in" disabled={busy} onClick={() => void run("passkey")}
          style={{ ...btn, border: "1px solid #CBD5E1", background: "#fff", color: "#0B1F3A" }}>{busy ? "Signing in..." : "Sign in with a passkey"}</button>
      )}
      {error ? <p role="alert" style={{ margin: "0 0 8px", color: "#b42318", fontSize: 14 }}>{error}</p> : null}
      <p style={{ margin: 0, textAlign: "center", color: "#64748b", fontSize: 14 }}>or get a text code</p>
    </div>
  );
}
